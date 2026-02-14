import { TaskWithRecurrence } from './types';

/**
 * Recurrence resolution: determines which tasks appear on a given date.
 *
 * Why pure functions? They're unit-testable without a database and can be
 * reused on both server and client. The DB provides the task list; these
 * functions filter it by date math.
 */

// ── Helpers ──────────────────────────────────────────────────────

/** Milliseconds in one day */
const MS_PER_DAY = 86_400_000;

/** Returns the number of days between two dates (ignoring time) */
function daysBetween(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / MS_PER_DAY);
}

/** Returns the ISO week number difference between two dates */
function weeksBetween(a: Date, b: Date): number {
  const days = daysBetween(a, b);
  return Math.floor(days / 7);
}

/** Returns the number of months between two dates */
function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

/**
 * Returns the day-of-month for the Nth occurrence of a given weekday in a month.
 * weekday: 0=Sunday...6=Saturday
 * n: 1-5 for first through fifth, -1 for last
 */
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): number | null {
  if (n === -1) {
    // Last occurrence: start from end of month and work backwards
    const lastDay = new Date(year, month + 1, 0).getDate();
    for (let d = lastDay; d >= 1; d--) {
      if (new Date(year, month, d).getDay() === weekday) {
        return d;
      }
    }
    return null;
  }

  // Nth occurrence: find the Nth weekday
  let count = 0;
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    if (new Date(year, month, d).getDay() === weekday) {
      count++;
      if (count === n) return d;
    }
  }
  return null; // e.g., no 5th Monday in this month
}

/** Get the Monday-based start of week for a date */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Adjust so Monday=0, Sunday=6
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Core resolution ─────────────────────────────────────────────

/**
 * Determines if a task with the given recurrence should appear on the target date.
 */
function taskAppearsOnDate(task: TaskWithRecurrence, target: Date): boolean {
  const rec = task.recurrence;

  switch (rec.type) {
    case 'none':
      return false;

    case 'daily': {
      if (rec.interval <= 1) return true;
      const ref = new Date(task.createdAt);
      const diff = daysBetween(ref, target);
      return diff >= 0 && diff % rec.interval === 0;
    }

    case 'weekly': {
      const dayOfWeek = target.getDay(); // 0=Sun...6=Sat
      if (!rec.daysOfWeek || !rec.daysOfWeek.includes(dayOfWeek)) return false;
      if (rec.interval <= 1) return true;
      const refWeekStart = getWeekStart(new Date(task.createdAt));
      const targetWeekStart = getWeekStart(target);
      const weeks = weeksBetween(refWeekStart, targetWeekStart);
      return weeks >= 0 && weeks % rec.interval === 0;
    }

    case 'monthly': {
      if (rec.interval > 1) {
        const ref = new Date(task.createdAt);
        const months = monthsBetween(ref, target);
        if (months < 0 || months % rec.interval !== 0) return false;
      }

      if (rec.weekOfMonth != null && rec.daysOfWeek && rec.daysOfWeek.length > 0) {
        const targetDay = getNthWeekdayOfMonth(
          target.getFullYear(),
          target.getMonth(),
          rec.daysOfWeek[0],
          rec.weekOfMonth
        );
        return targetDay === target.getDate();
      }

      if (rec.dayOfMonth != null) {
        const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
        const effectiveDay = Math.min(rec.dayOfMonth, lastDay);
        return target.getDate() === effectiveDay;
      }

      return false;
    }

    case 'yearly': {
      if (rec.monthOfYear == null || rec.dayOfMonth == null) return false;
      if (target.getMonth() + 1 !== rec.monthOfYear) return false;
      const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
      const effectiveDay = Math.min(rec.dayOfMonth, lastDay);
      return target.getDate() === effectiveDay;
    }

    default:
      return false;
  }
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Returns all tasks that should appear on the given date.
 * Pure function: accepts tasks as input, no DB dependency.
 */
export function getTasksForDate(date: Date, tasks: TaskWithRecurrence[]): TaskWithRecurrence[] {
  return tasks.filter((task) => taskAppearsOnDate(task, date));
}

/**
 * Returns tasks grouped by day index (0=Monday...6=Sunday) for a given week.
 * Excludes daily tasks (they'd appear every day and clutter the week view).
 */
export function getTasksForWeek(
  weekStart: Date,
  tasks: TaskWithRecurrence[]
): Map<number, TaskWithRecurrence[]> {
  const result = new Map<number, TaskWithRecurrence[]>();

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);

    const dayTasks = tasks.filter((task) => {
      if (task.recurrence.type === 'daily') return false;
      return taskAppearsOnDate(task, date);
    });

    if (dayTasks.length > 0) {
      result.set(i, dayTasks);
    }
  }

  return result;
}

/**
 * Returns tasks grouped by day of month (1-31) for a given month.
 * Excludes daily and weekly tasks (they'd clutter the month view).
 */
export function getTasksForMonth(
  year: number,
  month: number, // 0-based (JS convention)
  tasks: TaskWithRecurrence[]
): Map<number, TaskWithRecurrence[]> {
  const result = new Map<number, TaskWithRecurrence[]>();
  const lastDay = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month, d);

    const dayTasks = tasks.filter((task) => {
      if (task.recurrence.type === 'daily') return false;
      if (task.recurrence.type === 'weekly') return false;
      return taskAppearsOnDate(task, date);
    });

    if (dayTasks.length > 0) {
      result.set(d, dayTasks);
    }
  }

  return result;
}

/**
 * Generates a human-readable description of a recurrence pattern in Portuguese.
 */
export function describeRecurrence(rec: {
  type: string;
  interval: number;
  daysOfWeek?: number[] | null;
  dayOfMonth?: number | null;
  monthOfYear?: number | null;
  weekOfMonth?: number | null;
}): string {
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  switch (rec.type) {
    case 'daily':
      if (rec.interval <= 1) return 'Todo dia';
      return `A cada ${rec.interval} dias`;

    case 'weekly': {
      const days = (rec.daysOfWeek || []).map((d) => dayNames[d]).join(', ');
      if (rec.interval <= 1) {
        if ((rec.daysOfWeek || []).length === 7) return 'Todo dia';
        return days ? `Toda ${days}` : 'Semanal';
      }
      return `A cada ${rec.interval} semanas${days ? ` (${days})` : ''}`;
    }

    case 'monthly': {
      const base = rec.interval > 1 ? `A cada ${rec.interval} meses` : '';

      if (rec.weekOfMonth != null && rec.daysOfWeek && rec.daysOfWeek.length > 0) {
        const ordinals = ['', '1o', '2o', '3o', '4o', '5o'];
        const ord = rec.weekOfMonth === -1 ? 'Ultimo' : (ordinals[rec.weekOfMonth] || `${rec.weekOfMonth}o`);
        const day = dayNames[rec.daysOfWeek[0]];
        const suffix = base || 'do mes';
        return `${ord} ${day} ${suffix}`;
      }

      if (rec.dayOfMonth != null) {
        if (base) return `${base}, dia ${rec.dayOfMonth}`;
        return `Dia ${rec.dayOfMonth} de cada mes`;
      }

      return base || 'Mensal';
    }

    case 'yearly': {
      if (rec.monthOfYear != null && rec.dayOfMonth != null) {
        return `${rec.dayOfMonth} de ${monthNames[rec.monthOfYear - 1]} todo ano`;
      }
      return 'Anual';
    }

    case 'none':
      return 'Sem data definida';

    default:
      return '';
  }
}
