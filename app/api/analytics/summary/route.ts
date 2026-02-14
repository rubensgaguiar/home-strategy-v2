import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taskCompletions } from '@/lib/db/schema';
import { requireAuth, jsonError } from '@/lib/api-utils';
import { and, gte, lte, eq } from 'drizzle-orm';
import { getTasksForDate } from '@/lib/recurrence';
import { type TaskComplete } from '@/lib/types';

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function getMonday(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  const diff = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

// GET /api/analytics/summary?period=week|month
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const period = request.nextUrl.searchParams.get('period') || 'week';

  // Fetch all tasks with recurrences
  const allTasks = await db.query.tasks.findMany({
    with: { recurrence: true, steps: true, protocol: true },
  }) as TaskComplete[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (period === 'week') {
    return NextResponse.json(await buildWeekSummary(allTasks, today, authResult.email));
  } else if (period === 'month') {
    return NextResponse.json(await buildMonthSummary(allTasks, today, authResult.email));
  }

  return jsonError('period must be "week" or "month"', 400);
}

async function buildWeekSummary(allTasks: TaskComplete[], today: Date, userEmail: string) {
  const weekStart = getMonday(today);
  const weekEnd = addDays(weekStart, 6);
  const prevWeekStart = addDays(weekStart, -7);
  const prevWeekEnd = addDays(weekStart, -1);

  // Fetch completions for both weeks
  const completions = await db
    .select()
    .from(taskCompletions)
    .where(
      and(
        gte(taskCompletions.date, formatDate(prevWeekStart)),
        lte(taskCompletions.date, formatDate(weekEnd)),
      ),
    );

  const completionMap = new Map<string, Map<number, string>>();
  for (const c of completions) {
    const dateStr = typeof c.date === 'string' ? c.date : formatDate(new Date(c.date));
    if (!completionMap.has(dateStr)) completionMap.set(dateStr, new Map());
    if (c.taskId !== null) completionMap.get(dateStr)!.set(c.taskId, c.status);
  }

  // Build daily stats for current week
  const days: { date: string; done: number; total: number; rate: number }[] = [];
  const categoryStats = new Map<string, { done: number; total: number }>();
  const personStats = new Map<string, { done: number; total: number }>();

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    if (day > today) break;

    const dayStr = formatDate(day);
    const dayTasks = getTasksForDate(day, allTasks);
    const essential = dayTasks.filter((t) => !t.optional);
    const dayCompletions = completionMap.get(dayStr) || new Map();

    const doneCount = essential.filter((t) => dayCompletions.get(t.id) === 'done').length;
    const rate = essential.length > 0 ? Math.round((doneCount / essential.length) * 100) : 100;

    days.push({ date: dayStr, done: doneCount, total: essential.length, rate });

    // Accumulate category and person stats
    for (const task of essential) {
      const cat = categoryStats.get(task.category) || { done: 0, total: 0 };
      cat.total++;
      if (dayCompletions.get(task.id) === 'done') cat.done++;
      categoryStats.set(task.category, cat);

      const person = personStats.get(task.primaryPerson) || { done: 0, total: 0 };
      person.total++;
      if (dayCompletions.get(task.id) === 'done') person.done++;
      personStats.set(task.primaryPerson, person);
    }
  }

  // Build previous week stats for comparison
  let prevWeekDone = 0;
  let prevWeekTotal = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(prevWeekStart, i);
    const dayStr = formatDate(day);
    const dayTasks = getTasksForDate(day, allTasks);
    const essential = dayTasks.filter((t) => !t.optional);
    const dayCompletions = completionMap.get(dayStr) || new Map();

    prevWeekDone += essential.filter((t) => dayCompletions.get(t.id) === 'done').length;
    prevWeekTotal += essential.length;
  }

  const thisWeekDone = days.reduce((s, d) => s + d.done, 0);
  const thisWeekTotal = days.reduce((s, d) => s + d.total, 0);
  const thisWeekRate = thisWeekTotal > 0 ? Math.round((thisWeekDone / thisWeekTotal) * 100) : 0;
  const prevWeekRate = prevWeekTotal > 0 ? Math.round((prevWeekDone / prevWeekTotal) * 100) : 0;

  // Calculate streak (consecutive days >= 80%, going back from today)
  const streak = await calculateStreak(allTasks, today);

  // Categories sorted by rate
  const categories = Array.from(categoryStats.entries())
    .map(([name, s]) => ({ name, rate: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0, done: s.done, total: s.total }))
    .sort((a, b) => b.rate - a.rate);

  // Persons
  const persons = Array.from(personStats.entries())
    .map(([name, s]) => ({ name, rate: s.total > 0 ? Math.round((s.done / s.total) * 100) : 0, done: s.done, total: s.total }))
    .sort((a, b) => b.rate - a.rate);

  return {
    period: 'week',
    weekStart: formatDate(weekStart),
    weekEnd: formatDate(weekEnd),
    days,
    thisWeekRate,
    prevWeekRate,
    weekOverWeekDelta: thisWeekRate - prevWeekRate,
    streak,
    categories,
    persons,
  };
}

async function buildMonthSummary(allTasks: TaskComplete[], today: Date, userEmail: string) {
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  // Fetch completions for the month
  const completions = await db
    .select()
    .from(taskCompletions)
    .where(
      and(
        gte(taskCompletions.date, formatDate(monthStart)),
        lte(taskCompletions.date, formatDate(monthEnd)),
      ),
    );

  const completionMap = new Map<string, Map<number, string>>();
  for (const c of completions) {
    const dateStr = typeof c.date === 'string' ? c.date : formatDate(new Date(c.date));
    if (!completionMap.has(dateStr)) completionMap.set(dateStr, new Map());
    if (c.taskId !== null) completionMap.get(dateStr)!.set(c.taskId, c.status);
  }

  // Build daily stats
  const days: { date: string; day: number; done: number; total: number; rate: number }[] = [];
  const taskCompletionCounts = new Map<number, { done: number; total: number; name: string }>();

  const daysInMonth = monthEnd.getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month, d);
    if (day > today) break;

    const dayStr = formatDate(day);
    const dayTasks = getTasksForDate(day, allTasks);
    const essential = dayTasks.filter((t) => !t.optional);
    const dayCompletions = completionMap.get(dayStr) || new Map();

    const doneCount = essential.filter((t) => dayCompletions.get(t.id) === 'done').length;
    const rate = essential.length > 0 ? Math.round((doneCount / essential.length) * 100) : 100;

    days.push({ date: dayStr, day: d, done: doneCount, total: essential.length, rate });

    // Track per-task completion for "most skipped"
    for (const task of essential) {
      const tc = taskCompletionCounts.get(task.id) || { done: 0, total: 0, name: task.name };
      tc.total++;
      if (dayCompletions.get(task.id) === 'done') tc.done++;
      taskCompletionCounts.set(task.id, tc);
    }
  }

  const totalDone = days.reduce((s, d) => s + d.done, 0);
  const totalExpected = days.reduce((s, d) => s + d.total, 0);
  const monthRate = totalExpected > 0 ? Math.round((totalDone / totalExpected) * 100) : 0;

  const bestDay = days.length > 0 ? days.reduce((best, d) => d.rate > best.rate ? d : best) : null;
  const worstDay = days.filter((d) => d.total > 0).length > 0
    ? days.filter((d) => d.total > 0).reduce((worst, d) => d.rate < worst.rate ? d : worst)
    : null;

  // Most skipped tasks (lowest completion rate, min 5 appearances)
  const mostSkipped = Array.from(taskCompletionCounts.entries())
    .map(([id, tc]) => ({
      taskId: id,
      name: tc.name,
      rate: tc.total > 0 ? Math.round((tc.done / tc.total) * 100) : 0,
      done: tc.done,
      total: tc.total,
    }))
    .filter((t) => t.total >= 5)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 5);

  const streak = await calculateStreak(allTasks, today);

  return {
    period: 'month',
    year,
    month: month + 1,
    days,
    monthRate,
    bestDay,
    worstDay,
    mostSkipped,
    streak,
  };
}

async function calculateStreak(allTasks: TaskComplete[], today: Date): Promise<number> {
  // Look back up to 90 days to find streak
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const day = addDays(today, -i);
    const dayStr = formatDate(day);

    const dayTasks = getTasksForDate(day, allTasks);
    const essential = dayTasks.filter((t) => !t.optional);
    if (essential.length === 0) continue; // Skip days with no tasks

    const completions = await db
      .select()
      .from(taskCompletions)
      .where(eq(taskCompletions.date, dayStr));

    const completionMap = new Map(completions.map((c) => [c.taskId, c.status]));
    const doneCount = essential.filter((t) => completionMap.get(t.id) === 'done').length;
    const rate = Math.round((doneCount / essential.length) * 100);

    if (rate >= 80) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
