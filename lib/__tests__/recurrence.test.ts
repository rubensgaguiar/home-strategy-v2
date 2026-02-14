import { describe, it, expect } from 'vitest';
import { getTasksForDate, getTasksForWeek, getTasksForMonth, describeRecurrence } from '../recurrence';
import { TaskWithRecurrence } from '../types';

// ── Test helpers ────────────────────────────────────────────────

/**
 * Use `new Date(y, m, d)` (local midnight) instead of `new Date('YYYY-MM-DD')`
 * (UTC midnight). The latter shifts to the previous day in negative-offset
 * timezones (e.g., Brasilia GMT-3), breaking getDay()/getDate() assertions.
 */
function d(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day); // month is 1-based for readability
}

type RecurrenceOverrides = Partial<Pick<TaskWithRecurrence['recurrence'],
  'type' | 'interval' | 'daysOfWeek' | 'dayOfMonth' | 'monthOfYear' | 'weekOfMonth' | 'periods'
>>;

function makeTask(
  overrides: Partial<Omit<TaskWithRecurrence, 'recurrence'>> & { recurrence: RecurrenceOverrides }
): TaskWithRecurrence {
  const base = {
    id: 1,
    name: 'Test Task',
    category: 'casa' as const,
    primaryPerson: 'rubens' as const,
    secondaryPerson: null,
    planB: null,
    optional: false,
    sortOrder: 0,
    protocolId: null,
    createdAt: d(2025, 1, 6), // Mon Jan 6 2025
    updatedAt: d(2025, 1, 6),
    ...overrides,
  };

  const recurrenceDefaults: TaskWithRecurrence['recurrence'] = {
    id: 1,
    taskId: base.id,
    type: 'daily',
    interval: 1,
    daysOfWeek: null,
    dayOfMonth: null,
    monthOfYear: null,
    weekOfMonth: null,
    periods: ['MA'],
  };

  return {
    ...base,
    recurrence: { ...recurrenceDefaults, ...overrides.recurrence },
  };
}

// ── getTasksForDate ─────────────────────────────────────────────

describe('getTasksForDate', () => {
  describe('daily recurrence', () => {
    it('returns daily tasks on any date', () => {
      const task = makeTask({ recurrence: { type: 'daily', interval: 1, periods: ['MA'] } });
      const result = getTasksForDate(d(2025, 2, 15), [task]);
      expect(result).toHaveLength(1);
    });

    it('returns daily interval=2 tasks on correct dates', () => {
      // Created Jan 6 (Mon), interval=2 => appears Jan 6, Jan 8, Jan 10...
      const task = makeTask({
        createdAt: d(2025, 1, 6),
        recurrence: { type: 'daily', interval: 2, periods: ['MA'] },
      });

      expect(getTasksForDate(d(2025, 1, 6), [task])).toHaveLength(1); // day 0
      expect(getTasksForDate(d(2025, 1, 7), [task])).toHaveLength(0); // day 1
      expect(getTasksForDate(d(2025, 1, 8), [task])).toHaveLength(1); // day 2
      expect(getTasksForDate(d(2025, 1, 9), [task])).toHaveLength(0); // day 3
    });

    it('does not return daily tasks before createdAt when interval > 1', () => {
      const task = makeTask({
        createdAt: d(2025, 1, 10),
        recurrence: { type: 'daily', interval: 3, periods: ['MA'] },
      });

      expect(getTasksForDate(d(2025, 1, 9), [task])).toHaveLength(0);
      expect(getTasksForDate(d(2025, 1, 10), [task])).toHaveLength(1);
    });
  });

  describe('weekly recurrence', () => {
    it('returns weekly tasks on matching days', () => {
      // days_of_week: [1, 3] = Monday, Wednesday
      const task = makeTask({
        recurrence: { type: 'weekly', interval: 1, daysOfWeek: [1, 3], periods: ['TA'] },
      });

      // Feb 10 2025 = Monday, Feb 12 = Wednesday
      expect(getTasksForDate(d(2025, 2, 10), [task])).toHaveLength(1);
      expect(getTasksForDate(d(2025, 2, 11), [task])).toHaveLength(0); // Tuesday
      expect(getTasksForDate(d(2025, 2, 12), [task])).toHaveLength(1);
    });

    it('handles biweekly (interval=2) correctly', () => {
      // Created Jan 6 (Mon), weekly interval=2 on Saturdays (6)
      const task = makeTask({
        createdAt: d(2025, 1, 6), // week starting Jan 6
        recurrence: { type: 'weekly', interval: 2, daysOfWeek: [6], periods: ['TA'] },
      });

      // Week of Jan 6: first interval week
      expect(getTasksForDate(d(2025, 1, 11), [task])).toHaveLength(1); // Sat, week 0

      // Week of Jan 13: skip (odd week)
      expect(getTasksForDate(d(2025, 1, 18), [task])).toHaveLength(0); // Sat, week 1

      // Week of Jan 20: second interval week
      expect(getTasksForDate(d(2025, 1, 25), [task])).toHaveLength(1); // Sat, week 2
    });

    it('does not match non-listed days', () => {
      const task = makeTask({
        recurrence: { type: 'weekly', interval: 1, daysOfWeek: [0], periods: ['MA'] },
      });

      // Feb 10 2025 = Monday (day 1)
      expect(getTasksForDate(d(2025, 2, 10), [task])).toHaveLength(0);
      // Feb 9 2025 = Sunday (day 0)
      expect(getTasksForDate(d(2025, 2, 9), [task])).toHaveLength(1);
    });
  });

  describe('monthly recurrence', () => {
    it('matches by day_of_month', () => {
      const task = makeTask({
        recurrence: { type: 'monthly', interval: 1, dayOfMonth: 15, periods: ['NO'] },
      });

      expect(getTasksForDate(d(2025, 1, 15), [task])).toHaveLength(1);
      expect(getTasksForDate(d(2025, 2, 15), [task])).toHaveLength(1);
      expect(getTasksForDate(d(2025, 2, 14), [task])).toHaveLength(0);
    });

    it('handles day 31 in months with fewer days', () => {
      const task = makeTask({
        recurrence: { type: 'monthly', interval: 1, dayOfMonth: 31, periods: ['NO'] },
      });

      // Feb 2025 has 28 days, so day 31 -> day 28
      expect(getTasksForDate(d(2025, 2, 28), [task])).toHaveLength(1);
      expect(getTasksForDate(d(2025, 1, 31), [task])).toHaveLength(1);
      // April has 30 days, so day 31 -> day 30
      expect(getTasksForDate(d(2025, 4, 30), [task])).toHaveLength(1);
    });

    it('matches Nth weekday of month (1st Saturday)', () => {
      const task = makeTask({
        recurrence: {
          type: 'monthly', interval: 1, weekOfMonth: 1, daysOfWeek: [6], periods: ['MA'],
        },
      });

      // 1st Saturday of Feb 2025 = Feb 1
      expect(getTasksForDate(d(2025, 2, 1), [task])).toHaveLength(1);
      expect(getTasksForDate(d(2025, 2, 8), [task])).toHaveLength(0); // 2nd Saturday

      // 1st Saturday of March 2025 = March 1
      expect(getTasksForDate(d(2025, 3, 1), [task])).toHaveLength(1);
    });

    it('matches last weekday of month', () => {
      const task = makeTask({
        recurrence: {
          type: 'monthly', interval: 1, weekOfMonth: -1, daysOfWeek: [5], periods: ['TA'],
        },
      });

      // Last Friday of Feb 2025 = Feb 28
      expect(getTasksForDate(d(2025, 2, 28), [task])).toHaveLength(1);
      // Last Friday of Jan 2025 = Jan 31
      expect(getTasksForDate(d(2025, 1, 31), [task])).toHaveLength(1);
    });

    it('handles monthly interval > 1', () => {
      const task = makeTask({
        createdAt: d(2025, 1, 15),
        recurrence: { type: 'monthly', interval: 2, dayOfMonth: 15, periods: ['MA'] },
      });

      expect(getTasksForDate(d(2025, 1, 15), [task])).toHaveLength(1); // month 0
      expect(getTasksForDate(d(2025, 2, 15), [task])).toHaveLength(0); // month 1
      expect(getTasksForDate(d(2025, 3, 15), [task])).toHaveLength(1); // month 2
    });
  });

  describe('yearly recurrence', () => {
    it('matches specific date', () => {
      const task = makeTask({
        recurrence: {
          type: 'yearly', interval: 1, dayOfMonth: 15, monthOfYear: 3, periods: ['MA'],
        },
      });

      expect(getTasksForDate(d(2025, 3, 15), [task])).toHaveLength(1);
      expect(getTasksForDate(d(2025, 3, 16), [task])).toHaveLength(0);
      expect(getTasksForDate(d(2026, 3, 15), [task])).toHaveLength(1);
    });

    it('handles Feb 29 on non-leap years', () => {
      const task = makeTask({
        recurrence: {
          type: 'yearly', interval: 1, dayOfMonth: 29, monthOfYear: 2, periods: ['MA'],
        },
      });

      // 2025 is not a leap year - Feb has 28 days, so 29 -> 28
      expect(getTasksForDate(d(2025, 2, 28), [task])).toHaveLength(1);
      // 2024 is a leap year
      expect(getTasksForDate(d(2024, 2, 29), [task])).toHaveLength(1);
    });
  });

  describe('none recurrence', () => {
    it('never appears on any date', () => {
      const task = makeTask({
        recurrence: { type: 'none', interval: 1, periods: [] },
      });

      expect(getTasksForDate(d(2025, 2, 15), [task])).toHaveLength(0);
    });
  });

  describe('multiple tasks', () => {
    it('filters correctly with mixed recurrence types', () => {
      const dailyTask = makeTask({
        id: 1,
        name: 'Daily Task',
        recurrence: { type: 'daily', interval: 1, periods: ['MA'] },
      });
      const weeklyTask = makeTask({
        id: 2,
        name: 'Weekly Monday Task',
        recurrence: { type: 'weekly', interval: 1, daysOfWeek: [1], periods: ['TA'] },
      });
      const noneTask = makeTask({
        id: 3,
        name: 'Inbox Task',
        recurrence: { type: 'none', interval: 1, periods: [] },
      });

      // Monday Feb 10 2025
      const monday = getTasksForDate(d(2025, 2, 10), [dailyTask, weeklyTask, noneTask]);
      expect(monday).toHaveLength(2);
      expect(monday.map((t) => t.name)).toContain('Daily Task');
      expect(monday.map((t) => t.name)).toContain('Weekly Monday Task');

      // Tuesday Feb 11 2025
      const tuesday = getTasksForDate(d(2025, 2, 11), [dailyTask, weeklyTask, noneTask]);
      expect(tuesday).toHaveLength(1);
      expect(tuesday[0].name).toBe('Daily Task');
    });
  });
});

// ── getTasksForWeek ─────────────────────────────────────────────

describe('getTasksForWeek', () => {
  it('groups weekly tasks by day index and excludes daily tasks', () => {
    const dailyTask = makeTask({
      id: 1,
      name: 'Daily',
      recurrence: { type: 'daily', interval: 1, periods: ['MA'] },
    });
    const mondayTask = makeTask({
      id: 2,
      name: 'Monday',
      recurrence: { type: 'weekly', interval: 1, daysOfWeek: [1], periods: ['TA'] },
    });
    const saturdayTask = makeTask({
      id: 3,
      name: 'Saturday',
      recurrence: { type: 'weekly', interval: 1, daysOfWeek: [6], periods: ['MA'] },
    });

    // Week starting Monday Feb 10, 2025 (local midnight)
    const weekStart = d(2025, 2, 10);
    const result = getTasksForWeek(weekStart, [dailyTask, mondayTask, saturdayTask]);

    // Day 0 = Monday => mondayTask
    expect(result.get(0)?.map((t) => t.name)).toEqual(['Monday']);
    // Day 5 = Saturday => saturdayTask
    expect(result.get(5)?.map((t) => t.name)).toEqual(['Saturday']);
    // Daily task should NOT appear
    expect(result.get(1)).toBeUndefined(); // Tuesday - no tasks
  });
});

// ── getTasksForMonth ────────────────────────────────────────────

describe('getTasksForMonth', () => {
  it('groups monthly tasks by day and excludes daily and weekly tasks', () => {
    const dailyTask = makeTask({
      id: 1,
      recurrence: { type: 'daily', interval: 1, periods: ['MA'] },
    });
    const weeklyTask = makeTask({
      id: 2,
      recurrence: { type: 'weekly', interval: 1, daysOfWeek: [1], periods: ['TA'] },
    });
    const monthlyTask = makeTask({
      id: 3,
      name: 'Monthly 15th',
      recurrence: { type: 'monthly', interval: 1, dayOfMonth: 15, periods: ['NO'] },
    });

    // Feb 2025
    const result = getTasksForMonth(2025, 1, [dailyTask, weeklyTask, monthlyTask]);

    expect(result.get(15)?.map((t) => t.name)).toEqual(['Monthly 15th']);
    expect(result.get(1)).toBeUndefined(); // no daily/weekly
    expect(result.get(10)).toBeUndefined();
  });
});

// ── describeRecurrence ──────────────────────────────────────────

describe('describeRecurrence', () => {
  it('describes daily', () => {
    expect(describeRecurrence({ type: 'daily', interval: 1 })).toBe('Todo dia');
    expect(describeRecurrence({ type: 'daily', interval: 3 })).toBe('A cada 3 dias');
  });

  it('describes weekly', () => {
    expect(describeRecurrence({ type: 'weekly', interval: 1, daysOfWeek: [1, 3] })).toBe('Toda Seg, Qua');
    expect(describeRecurrence({ type: 'weekly', interval: 2, daysOfWeek: [6] })).toBe('A cada 2 semanas (Sab)');
  });

  it('describes monthly by day', () => {
    expect(describeRecurrence({ type: 'monthly', interval: 1, dayOfMonth: 15 })).toBe('Dia 15 de cada mes');
    expect(describeRecurrence({ type: 'monthly', interval: 2, dayOfMonth: 5 })).toBe('A cada 2 meses, dia 5');
  });

  it('describes monthly by weekday', () => {
    expect(describeRecurrence({ type: 'monthly', interval: 1, weekOfMonth: 1, daysOfWeek: [6] })).toBe('1o Sab do mes');
    expect(describeRecurrence({ type: 'monthly', interval: 1, weekOfMonth: -1, daysOfWeek: [5] })).toBe('Ultimo Sex do mes');
  });

  it('describes yearly', () => {
    expect(describeRecurrence({ type: 'yearly', interval: 1, dayOfMonth: 15, monthOfYear: 3 })).toBe('15 de Marco todo ano');
  });

  it('describes none', () => {
    expect(describeRecurrence({ type: 'none', interval: 1 })).toBe('Sem data definida');
  });
});
