import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pushSubscriptions, notificationPreferences, taskCompletions } from '@/lib/db/schema';
import { jsonError } from '@/lib/api-utils';
import { eq, and } from 'drizzle-orm';
import { getTasksForDate } from '@/lib/recurrence';
import { type TaskWithRecurrence } from '@/lib/types';
import webpush from 'web-push';

type Period = 'MA' | 'TA' | 'NO';

// Notification schedule (BRT = UTC-3)
const SCHEDULE: { hour: number; minute: number; type: 'period_start' | 'period_end' | 'daily_summary'; period?: Period }[] = [
  { hour: 6, minute: 0, type: 'period_start', period: 'MA' },
  { hour: 11, minute: 30, type: 'period_end', period: 'MA' },
  { hour: 12, minute: 0, type: 'period_start', period: 'TA' },
  { hour: 17, minute: 30, type: 'period_end', period: 'TA' },
  { hour: 18, minute: 0, type: 'period_start', period: 'NO' },
  { hour: 21, minute: 0, type: 'period_end', period: 'NO' },
  { hour: 21, minute: 30, type: 'daily_summary' },
];

const PERIOD_LABELS: Record<Period, string> = {
  MA: 'manha',
  TA: 'tarde',
  NO: 'noite',
};

const PERIOD_GREETINGS: Record<Period, string> = {
  MA: 'Bom dia',
  TA: 'Boa tarde',
  NO: 'Boa noite',
};

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// POST /api/notifications/send — Cron-triggered notification sender
export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return jsonError('Unauthorized', 401);
  }

  // Configure web-push
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    return jsonError('VAPID keys not configured', 500);
  }

  webpush.setVapidDetails(
    'mailto:notifications@homestrategy.app',
    vapidPublicKey,
    vapidPrivateKey,
  );

  // Get current time in BRT (UTC-3)
  const now = new Date();
  const brt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const currentHour = brt.getHours();
  const currentMinute = brt.getMinutes();

  // Find matching schedule entry (within 15-minute window)
  const matchingEntry = SCHEDULE.find((entry) => {
    const diffMinutes = (currentHour * 60 + currentMinute) - (entry.hour * 60 + entry.minute);
    return diffMinutes >= 0 && diffMinutes < 15;
  });

  if (!matchingEntry) {
    return NextResponse.json({ sent: 0, message: 'No matching schedule entry' });
  }

  // Get all users with active notifications
  const prefs = await db.query.notificationPreferences.findMany({
    where: eq(notificationPreferences.enabled, true),
  });

  if (prefs.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No users with notifications enabled' });
  }

  // Filter by preference type
  const eligibleUsers = prefs.filter((p) => {
    if (matchingEntry.type === 'period_start') return p.periodStart;
    if (matchingEntry.type === 'period_end') return p.periodEnd;
    if (matchingEntry.type === 'daily_summary') return p.dailySummary;
    return false;
  });

  if (eligibleUsers.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No users eligible for this notification type' });
  }

  // Fetch all tasks with recurrences for today
  const allTasks = await db.query.tasks.findMany({
    with: { recurrence: true, steps: true },
  }) as TaskWithRecurrence[];

  const today = new Date(brt.getFullYear(), brt.getMonth(), brt.getDate());
  const todayTasks = getTasksForDate(today, allTasks);
  const todayStr = formatDate(today);

  let totalSent = 0;

  for (const userPref of eligibleUsers) {
    // Get user's completions for today
    const completions = await db.query.taskCompletions.findMany({
      where: and(
        eq(taskCompletions.date, todayStr),
        eq(taskCompletions.userEmail, userPref.userEmail),
      ),
    });

    const completionMap = new Map(completions.map((c) => [c.taskId, c.status]));

    // Get user's tasks (filter to their assigned tasks)
    const userTasks = todayTasks.filter(
      (t) => t.primaryPerson === 'juntos' || isUserPerson(userPref.userEmail, t.primaryPerson),
    );

    // Build notification payload based on type
    let title = '';
    let body = '';

    if (matchingEntry.type === 'period_start' && matchingEntry.period) {
      const periodTasks = userTasks.filter((t) => t.recurrence.periods.includes(matchingEntry.period!));
      const pendingCount = periodTasks.filter((t) => !completionMap.has(t.id)).length;

      if (pendingCount === 0) continue; // Skip if no pending tasks

      title = `${PERIOD_GREETINGS[matchingEntry.period]}!`;
      body = `Voce tem ${pendingCount} tarefa${pendingCount > 1 ? 's' : ''} para a ${PERIOD_LABELS[matchingEntry.period]}.`;
    } else if (matchingEntry.type === 'period_end' && matchingEntry.period) {
      const periodTasks = userTasks.filter((t) => t.recurrence.periods.includes(matchingEntry.period!));
      const pendingCount = periodTasks.filter((t) => !completionMap.has(t.id)).length;

      if (pendingCount === 0) continue; // Only send if there are pending tasks

      title = `${pendingCount} tarefa${pendingCount > 1 ? 's' : ''} pendente${pendingCount > 1 ? 's' : ''}`;
      body = `Ainda restam tarefas para a ${PERIOD_LABELS[matchingEntry.period]}.`;
    } else if (matchingEntry.type === 'daily_summary') {
      const essentialTasks = userTasks.filter((t) => !t.optional);
      const doneCount = essentialTasks.filter((t) => completionMap.get(t.id) === 'done').length;
      const totalEssential = essentialTasks.length;
      const pct = totalEssential > 0 ? Math.round((doneCount / totalEssential) * 100) : 100;

      title = 'Resumo do dia';
      body = `Hoje voce completou ${doneCount} de ${totalEssential} tarefas essenciais (${pct}%).`;
    }

    // Get user's push subscriptions
    const subs = await db.query.pushSubscriptions.findMany({
      where: eq(pushSubscriptions.userEmail, userPref.userEmail),
    });

    const payload = JSON.stringify({ title, body, url: '/home' });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload,
        );
        totalSent++;
      } catch (err: unknown) {
        // Remove expired subscriptions (410 Gone or 404)
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        }
      }
    }
  }

  return NextResponse.json({ sent: totalSent });
}

function isUserPerson(email: string, person: string): boolean {
  const lower = email.toLowerCase();
  if (person === 'rubens') return lower.includes('rubens');
  if (person === 'diene') return lower.includes('diene');
  return false;
}
