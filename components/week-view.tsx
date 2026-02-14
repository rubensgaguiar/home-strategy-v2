'use client';

import { useState, useMemo } from 'react';
import { TaskComplete, CompletionStatus, Person } from '@/lib/types';
import { categoryDisplayName } from '@/lib/types';
import {
  categoryDbIcon,
  getPersonStyle,
  filterByPersonDb,
  formatDate,
} from '@/lib/helpers';
import { getTasksForDate } from '@/lib/recurrence';
import { useLongPress } from '@/lib/hooks/use-long-press';
import { useCompletions } from '@/lib/hooks/use-completions';

interface Props {
  tasks: TaskComplete[];
  weekStart: Date;
  person: Person | 'todos';
  onEditTask?: (task: TaskComplete) => void;
}

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

function WeekTaskRow({ task, children, onEdit }: { task: TaskComplete; children: React.ReactNode; onEdit?: (task: TaskComplete) => void }) {
  const handlers = useLongPress(() => onEdit?.(task));
  return <div {...handlers}>{children}</div>;
}

export function WeekView({ tasks, weekStart, person, onEditTask }: Props) {
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set());
  const today = new Date();
  const todayStr = formatDate(today);

  // Build week days
  const weekDays = useMemo(() => {
    const days: { date: Date; dayIndex: number; dateStr: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push({ date: d, dayIndex: i, dateStr: formatDate(d) });
    }
    return days;
  }, [weekStart]);

  // Get tasks per day (exclude daily to avoid clutter)
  const dayTasks = useMemo(() => {
    const result: Map<number, TaskComplete[]> = new Map();
    for (const { date, dayIndex } of weekDays) {
      const dayResult = getTasksForDate(date, tasks).filter(
        (t) => t.recurrence.type !== 'daily'
      );
      const filtered = filterByPersonDb(dayResult, person);
      if (filtered.length > 0) {
        result.set(dayIndex, filtered);
      }
    }
    return result;
  }, [weekDays, tasks, person]);

  function toggleDay(idx: number) {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <div className="space-y-2 stagger-children">
      {weekDays.map(({ date, dayIndex, dateStr }) => {
        const dayTaskList = dayTasks.get(dayIndex) ?? [];
        const isToday = dateStr === todayStr;
        const isCollapsed = collapsedDays.has(dayIndex);
        const dayNum = date.getDate();
        const monthNum = date.getMonth() + 1;

        return (
          <div key={dayIndex} className="bg-surface rounded-2xl border border-border overflow-hidden">
            <button
              onClick={() => toggleDay(dayIndex)}
              className="w-full px-4 py-2.5 flex items-center gap-3 tap-highlight"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`text-[13px] font-bold ${isToday ? 'text-accent' : 'text-foreground'}`}>
                  {DAY_NAMES[dayIndex]}
                </span>
                <span className="text-[11px] text-muted">
                  {dayNum}/{monthNum}
                </span>
                {isToday && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-accent/10 text-accent uppercase tracking-wider">
                    hoje
                  </span>
                )}
              </div>
              <span className="text-[11px] font-semibold text-muted tabular-nums">
                {dayTaskList.length} {dayTaskList.length === 1 ? 'tarefa' : 'tarefas'}
              </span>
              <svg
                className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {!isCollapsed && dayTaskList.length > 0 && (
              <DayCompletionSection
                dateStr={dateStr}
                tasks={dayTaskList}
                onEditTask={onEditTask}
              />
            )}

            {!isCollapsed && dayTaskList.length === 0 && (
              <div className="px-4 py-3 text-center">
                <p className="text-[12px] text-muted">Sem tarefas especificas</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Inner component that fetches completions for a specific date */
function DayCompletionSection({ dateStr, tasks, onEditTask }: { dateStr: string; tasks: TaskComplete[]; onEditTask?: (task: TaskComplete) => void }) {
  const { isChecked, getStatus, markDone, markNotDone, undo } = useCompletions(dateStr);

  return (
    <div className="px-4 pb-2 animate-slide-down">
      {tasks.map((task) => {
        const status = getStatus(task.id);
        const checked = status === 'done';
        const notDone = status === 'not_done';
        const ps = getPersonStyle(task.primaryPerson);

        return (
          <WeekTaskRow key={task.id} task={task} onEdit={onEditTask}>
            <div className="py-1.5 flex items-center gap-2.5">
              <button
                onClick={() => {
                  if (status === null) markDone(task.id);
                  else undo(task.id);
                }}
                className={`shrink-0 w-[18px] h-[18px] rounded-md border-[1.5px] flex items-center justify-center transition-all duration-150 ${
                  checked
                    ? 'bg-accent border-accent'
                    : notDone
                    ? 'bg-red-100 border-red-400 dark:bg-red-900/40 dark:border-red-500'
                    : 'border-border hover:border-muted'
                }`}
              >
                {checked && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {notDone && (
                  <svg className="w-2.5 h-2.5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </button>
              <span className={`text-[13px] flex-1 min-w-0 truncate ${
                checked ? 'text-muted line-through' : notDone ? 'text-red-400 line-through' : 'text-foreground'
              }`}>
                {task.name}
              </span>
              <span className="text-[10px]">{categoryDbIcon[task.category]}</span>
              <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${ps.dot}`} />
            </div>
          </WeekTaskRow>
        );
      })}
    </div>
  );
}
