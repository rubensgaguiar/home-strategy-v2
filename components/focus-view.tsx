'use client';

import { useState, useMemo } from 'react';
import { Task, Period, DayOfWeek, Person } from '@/lib/types';
import {
  PERIODS,
  categoryIcon,
  getPersonStyle,
  getCurrentPeriod,
  getTasksForDayAndPeriod,
  filterByPerson,
  getPlanB,
} from '@/lib/helpers';
import { ProgressRing } from './progress-ring';

interface Props {
  selectedDay: DayOfWeek;
  isToday: boolean;
  person: Person | 'todos';
  isChecked: (id: string) => boolean;
  onCheck: (id: string) => void;
}

export function FocusView({ selectedDay, isToday, person, isChecked, onCheck }: Props) {
  const [showPlanB, setShowPlanB] = useState(false);

  const { queue, stats } = useMemo(() => {
    const currentPeriod = isToday ? getCurrentPeriod() : null;
    const periodOrder: Period[] = ['MA', 'TA', 'NO'];

    let currentIdx = currentPeriod ? periodOrder.indexOf(currentPeriod) : 0;
    if (currentIdx === -1) currentIdx = 0;

    type QueueItem = { task: Task; period: Period; overdue: boolean };
    const items: QueueItem[] = [];

    // Current period first
    const cp = periodOrder[currentIdx];
    const ct = filterByPerson(getTasksForDayAndPeriod(selectedDay, cp), person);
    items.push(...ct.map((task) => ({ task, period: cp, overdue: false })));

    // Overdue periods (only if today)
    if (isToday) {
      for (let i = 0; i < currentIdx; i++) {
        const p = periodOrder[i];
        const t = filterByPerson(getTasksForDayAndPeriod(selectedDay, p), person);
        items.push(...t.map((task) => ({ task, period: p, overdue: true })));
      }
    }

    // Future periods
    for (let i = currentIdx + 1; i < periodOrder.length; i++) {
      const p = periodOrder[i];
      const t = filterByPerson(getTasksForDayAndPeriod(selectedDay, p), person);
      items.push(...t.map((task) => ({ task, period: p, overdue: false })));
    }

    // Optional tasks last
    items.sort((a, b) => {
      if (a.task.optional && !b.task.optional) return 1;
      if (!a.task.optional && b.task.optional) return -1;
      return 0;
    });

    return {
      queue: items,
      stats: {
        total: items.length,
        done: items.filter((i) => isChecked(i.task.id)).length,
      },
    };
  }, [selectedDay, isToday, person, isChecked]);

  const uncheckedItems = queue.filter((item) => !isChecked(item.task.id));
  const currentItem = uncheckedItems.length > 0 ? uncheckedItems[0] : null;

  function handleDone() {
    if (!currentItem) return;
    onCheck(currentItem.task.id);
    setShowPlanB(false);
  }

  function handleSkip() {
    if (!currentItem) return;
    // Move to end by checking and immediately showing next
    // Actually just rotate — skip doesn't mark as done
    setShowPlanB(false);
    // Rotate the unchecked items by checking temporarily... no.
    // For skip, we just advance the view. But since uncheckedItems is derived,
    // we need a skip offset.
  }

  // ── All done ─────────────────────────────────────────────
  if (!currentItem) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-scale-in">
        <ProgressRing progress={100} size={80} />
        <p className="text-base font-bold text-foreground mt-5">
          Tudo feito
        </p>
        <p className="text-[13px] text-muted mt-1">
          {stats.done} de {stats.total} tarefas concluidas
        </p>
      </div>
    );
  }

  // ── Task card ────────────────────────────────────────────
  const { task, period, overdue } = currentItem;
  const personStyle = getPersonStyle(task.primary);
  const periodInfo = PERIODS.find((p) => p.id === period);
  const progressPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col items-center animate-fade-in" key={task.id}>
      {/* Progress ring */}
      <div className="mb-5">
        <ProgressRing progress={progressPct} size={64}>
          <span className="text-[13px] font-bold text-foreground tabular-nums">{stats.done}</span>
          <span className="text-[9px] text-muted">/{stats.total}</span>
        </ProgressRing>
      </div>

      {/* Card */}
      <div className="w-full bg-surface rounded-3xl border border-border shadow-sm overflow-hidden animate-slide-up">
        {/* Period + badges */}
        <div className="px-5 pt-5 flex items-center gap-2 flex-wrap">
          <span className="text-[13px] leading-none">{periodInfo?.icon}</span>
          <span className="text-[12px] font-medium text-muted">{periodInfo?.label}</span>
          {overdue && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              pendente
            </span>
          )}
          {task.optional && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-surface-hover text-muted">
              opcional
            </span>
          )}
        </div>

        {/* Task name */}
        <div className="px-5 pt-4 pb-3">
          <h2 className="text-[22px] font-bold text-foreground tracking-tight leading-tight">
            {task.name}
          </h2>
          {task.repetitions && (
            <span className="text-[12px] text-muted font-medium mt-0.5 block">
              {task.repetitions}
            </span>
          )}
        </div>

        {/* Category + Person */}
        <div className="px-5 pb-4 flex items-center gap-2">
          <span className="text-sm">{categoryIcon[task.category]}</span>
          <span className="text-[12px] text-muted">{task.category}</span>
          <span className="text-border">&middot;</span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg ${personStyle.bg}`}>
            {personStyle.label}
          </span>
        </div>

        {/* Plan B */}
        <div className="border-t border-border-subtle">
          <button
            onClick={() => setShowPlanB(!showPlanB)}
            className="w-full px-5 py-3 flex items-center gap-2 text-[12px] text-muted hover:text-amber-600 dark:hover:text-amber-400 transition-colors tap-highlight"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1 text-left">Plano B</span>
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${showPlanB ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showPlanB && (
            <div className="px-5 pb-4 animate-slide-down">
              <div className="px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/40 dark:border-amber-800/30">
                <p className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">
                  {getPlanB(task)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 mt-5 w-full">
        <button
          onClick={handleDone}
          className="flex-1 py-3.5 rounded-2xl text-[14px] font-semibold text-white bg-accent hover:brightness-110 active:scale-[0.98] shadow-sm shadow-accent/20 transition-all duration-150 tap-highlight"
        >
          Feito
        </button>
      </div>

      {/* Remaining */}
      <p className="mt-3 text-[11px] text-muted">
        {uncheckedItems.length - 1 > 0
          ? `${uncheckedItems.length - 1} ${uncheckedItems.length - 1 === 1 ? 'restante' : 'restantes'}`
          : 'Ultima tarefa'}
      </p>
    </div>
  );
}
