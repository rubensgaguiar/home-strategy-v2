'use client';

import { useEffect, useState, useCallback } from 'react';
import { categoryDisplayName, type CategoryDb } from '@/lib/types';

interface DayData {
  date: string;
  day?: number;
  done: number;
  total: number;
  rate: number;
}

interface CategoryData {
  name: string;
  rate: number;
  done: number;
  total: number;
}

interface PersonData {
  name: string;
  rate: number;
  done: number;
  total: number;
}

interface SkippedTask {
  taskId: number;
  name: string;
  rate: number;
  done: number;
  total: number;
}

interface WeekSummary {
  period: 'week';
  weekStart: string;
  weekEnd: string;
  days: DayData[];
  thisWeekRate: number;
  prevWeekRate: number;
  weekOverWeekDelta: number;
  streak: number;
  categories: CategoryData[];
  persons: PersonData[];
}

interface MonthSummary {
  period: 'month';
  year: number;
  month: number;
  days: DayData[];
  monthRate: number;
  bestDay: DayData | null;
  worstDay: DayData | null;
  mostSkipped: SkippedTask[];
  streak: number;
}

type ViewPeriod = 'week' | 'month';

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
const MONTH_NAMES = [
  '', 'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const PERSON_DISPLAY: Record<string, string> = {
  rubens: 'Rubens',
  diene: 'Diene',
  juntos: 'Juntos',
};

function rateColor(rate: number): string {
  if (rate >= 80) return 'bg-emerald-500 dark:bg-emerald-400';
  if (rate >= 50) return 'bg-amber-400 dark:bg-amber-500';
  return 'bg-red-400 dark:bg-red-500';
}

function rateTextColor(rate: number): string {
  if (rate >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-500 dark:text-red-400';
}

function heatMapColor(rate: number): string {
  if (rate >= 90) return 'bg-emerald-500 dark:bg-emerald-400';
  if (rate >= 70) return 'bg-emerald-300 dark:bg-emerald-600';
  if (rate >= 50) return 'bg-amber-300 dark:bg-amber-500';
  return 'bg-red-300 dark:bg-red-500';
}

export function DashboardView() {
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('week');
  const [weekData, setWeekData] = useState<WeekSummary | null>(null);
  const [monthData, setMonthData] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (period: ViewPeriod) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/summary?period=${period}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (period === 'week') setWeekData(data);
      else setMonthData(data);
    } catch {
      // Silent error — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(viewPeriod);
  }, [viewPeriod, fetchData]);

  return (
    <div className="space-y-4 stagger-children">
      {/* Period toggle */}
      <div className="flex items-center bg-surface border border-border rounded-xl p-0.5">
        {(['week', 'month'] as ViewPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => setViewPeriod(p)}
            className={`flex-1 py-1.5 text-[12px] font-semibold rounded-lg transition-all duration-200 tap-highlight ${
              viewPeriod === p ? 'bg-foreground text-background shadow-sm' : 'text-muted'
            }`}
          >
            {p === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && viewPeriod === 'week' && weekData && <WeekDashboard data={weekData} />}
      {!loading && viewPeriod === 'month' && monthData && <MonthDashboard data={monthData} />}
    </div>
  );
}

function WeekDashboard({ data }: { data: WeekSummary }) {
  return (
    <div className="space-y-3">
      {/* Top metrics row */}
      <div className="grid grid-cols-2 gap-2">
        {/* Overall rate */}
        <div className="bg-surface rounded-2xl border border-border p-3">
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1">Taxa geral</p>
          <p className={`text-2xl font-bold tabular-nums ${rateTextColor(data.thisWeekRate)}`}>
            {data.thisWeekRate}%
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            {data.weekOverWeekDelta !== 0 && (
              <>
                <svg
                  className={`w-3 h-3 ${data.weekOverWeekDelta > 0 ? 'text-emerald-500' : 'text-red-500'}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d={data.weekOverWeekDelta > 0 ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                </svg>
                <span className={`text-[10px] font-semibold ${data.weekOverWeekDelta > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {Math.abs(data.weekOverWeekDelta)}% vs semana ant.
                </span>
              </>
            )}
            {data.weekOverWeekDelta === 0 && (
              <span className="text-[10px] text-muted">= semana anterior</span>
            )}
          </div>
        </div>

        {/* Streak */}
        <div className="bg-surface rounded-2xl border border-border p-3">
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1">Sequencia</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-foreground tabular-nums">{data.streak}</p>
            <span className="text-lg">🔥</span>
          </div>
          <p className="text-[10px] text-muted mt-0.5">
            dia{data.streak !== 1 ? 's' : ''} consecutivo{data.streak !== 1 ? 's' : ''} ≥80%
          </p>
        </div>
      </div>

      {/* Bar chart — last 7 days */}
      <div className="bg-surface rounded-2xl border border-border p-4">
        <p className="text-[11px] font-semibold text-muted mb-3">Ultimos 7 dias</p>
        <div className="flex items-end gap-1.5 h-24">
          {data.days.map((day, i) => {
            const height = day.total > 0 ? Math.max(4, (day.rate / 100) * 96) : 4;
            const dayName = DAY_NAMES[getDayOfWeek(day.date)];

            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-semibold text-muted tabular-nums">{day.rate}%</span>
                <div className="w-full flex items-end" style={{ height: 96 }}>
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${rateColor(day.rate)}`}
                    style={{ height }}
                  />
                </div>
                <span className="text-[9px] text-muted">{dayName}</span>
              </div>
            );
          })}
        </div>
        {/* 80% threshold line */}
        <div className="relative -mt-[24px] mb-[24px] pointer-events-none">
          <div className="absolute left-0 right-0 border-t border-dashed border-accent/40" style={{ bottom: `${80 * 0.96}px` }} />
        </div>
      </div>

      {/* Categories */}
      {data.categories.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border p-4">
          <p className="text-[11px] font-semibold text-muted mb-2">Por categoria</p>
          <div className="space-y-2">
            {data.categories.map((cat) => (
              <div key={cat.name} className="flex items-center gap-2">
                <span className="text-[12px] w-20 truncate">{categoryDisplayName[cat.name as CategoryDb]}</span>
                <div className="flex-1 h-1.5 bg-border-subtle rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${rateColor(cat.rate)}`}
                    style={{ width: `${cat.rate}%` }}
                  />
                </div>
                <span className={`text-[11px] font-semibold tabular-nums w-8 text-right ${rateTextColor(cat.rate)}`}>
                  {cat.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Persons */}
      {data.persons.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border p-4">
          <p className="text-[11px] font-semibold text-muted mb-2">Por pessoa</p>
          <div className="flex gap-2">
            {data.persons.map((p) => (
              <div key={p.name} className="flex-1 bg-surface-hover rounded-xl p-3 text-center">
                <p className="text-[12px] font-medium text-foreground">{PERSON_DISPLAY[p.name] || p.name}</p>
                <p className={`text-lg font-bold tabular-nums ${rateTextColor(p.rate)}`}>{p.rate}%</p>
                <p className="text-[10px] text-muted">{p.done}/{p.total}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MonthDashboard({ data }: { data: MonthSummary }) {
  // Build calendar grid
  const firstDayOfMonth = new Date(data.year, data.month - 1, 1);
  const firstWeekday = firstDayOfMonth.getDay(); // 0=Sun
  const startOffset = firstWeekday === 0 ? 6 : firstWeekday - 1; // Monday-based offset
  const daysInMonth = new Date(data.year, data.month, 0).getDate();
  const dayRateMap = new Map(data.days.map((d) => [d.day, d.rate]));

  return (
    <div className="space-y-3">
      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface rounded-2xl border border-border p-3">
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1">
            {MONTH_NAMES[data.month]} {data.year}
          </p>
          <p className={`text-2xl font-bold tabular-nums ${rateTextColor(data.monthRate)}`}>
            {data.monthRate}%
          </p>
          <p className="text-[10px] text-muted mt-0.5">media de conclusao</p>
        </div>

        <div className="bg-surface rounded-2xl border border-border p-3">
          <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1">Sequencia</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-foreground tabular-nums">{data.streak}</p>
            <span className="text-lg">🔥</span>
          </div>
          <p className="text-[10px] text-muted mt-0.5">
            dia{data.streak !== 1 ? 's' : ''} ≥80%
          </p>
        </div>
      </div>

      {/* Heat map calendar */}
      <div className="bg-surface rounded-2xl border border-border p-4">
        <p className="text-[11px] font-semibold text-muted mb-3">Calendario</p>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-[9px] text-muted font-medium">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: startOffset }, (_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const rate = dayRateMap.get(day);
            const hasData = rate !== undefined;

            return (
              <div
                key={day}
                className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium ${
                  hasData ? `${heatMapColor(rate!)} text-white` : 'bg-border-subtle/50 text-muted'
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 justify-center">
          <span className="text-[9px] text-muted">Menos</span>
          <div className="w-3 h-3 rounded-sm bg-red-300 dark:bg-red-500" />
          <div className="w-3 h-3 rounded-sm bg-amber-300 dark:bg-amber-500" />
          <div className="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-600" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-400" />
          <span className="text-[9px] text-muted">Mais</span>
        </div>
      </div>

      {/* Best & worst day */}
      {(data.bestDay || data.worstDay) && (
        <div className="grid grid-cols-2 gap-2">
          {data.bestDay && (
            <div className="bg-surface rounded-2xl border border-border p-3">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1">Melhor dia</p>
              <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                Dia {data.bestDay.day} — {data.bestDay.rate}%
              </p>
            </div>
          )}
          {data.worstDay && (
            <div className="bg-surface rounded-2xl border border-border p-3">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wider mb-1">Pior dia</p>
              <p className="text-[13px] font-bold text-red-500 dark:text-red-400">
                Dia {data.worstDay.day} — {data.worstDay.rate}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Most skipped tasks */}
      {data.mostSkipped.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border p-4">
          <p className="text-[11px] font-semibold text-muted mb-2">Precisam de atencao</p>
          <div className="space-y-2">
            {data.mostSkipped.map((task) => (
              <div key={task.taskId} className="flex items-center gap-2">
                <span className="text-[12px] flex-1 min-w-0 truncate text-foreground">{task.name}</span>
                <div className="w-12 h-1.5 bg-border-subtle rounded-full overflow-hidden shrink-0">
                  <div
                    className={`h-full rounded-full ${rateColor(task.rate)}`}
                    style={{ width: `${task.rate}%` }}
                  />
                </div>
                <span className={`text-[11px] font-semibold tabular-nums w-8 text-right shrink-0 ${rateTextColor(task.rate)}`}>
                  {task.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}
