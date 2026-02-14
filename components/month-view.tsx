'use client';

import { useMemo } from 'react';
import { TaskComplete, Person } from '@/lib/types';
import {
  categoryDbIcon,
  getPersonStyle,
  filterByPersonDb,
} from '@/lib/helpers';
import { getTasksForMonth } from '@/lib/recurrence';

interface Props {
  tasks: TaskComplete[];
  year: number;
  month: number; // 0-based
  person: Person | 'todos';
  onEditTask?: (task: TaskComplete) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function MonthView({ tasks, year, month, person, onEditTask }: Props) {
  const today = new Date();
  const todayDay = today.getFullYear() === year && today.getMonth() === month ? today.getDate() : -1;

  const monthTasks = useMemo(() => {
    const raw = getTasksForMonth(year, month, tasks);
    const filtered = new Map<number, TaskComplete[]>();
    for (const [day, dayTasks] of raw) {
      const personFiltered = filterByPersonDb(dayTasks, person);
      if (personFiltered.length > 0) {
        filtered.set(day, personFiltered);
      }
    }
    return filtered;
  }, [tasks, year, month, person]);

  const sortedDays = Array.from(monthTasks.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-2 stagger-children">
      {sortedDays.length === 0 && (
        <div className="text-center py-8">
          <p className="text-[13px] text-muted">Sem tarefas mensais/anuais em {MONTH_NAMES[month]}</p>
        </div>
      )}

      {sortedDays.map((day) => {
        const dayTasks = monthTasks.get(day) ?? [];
        const isToday = day === todayDay;

        return (
          <div key={day} className="bg-surface rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-2.5 flex items-center gap-2 border-b border-border-subtle">
              <span className={`text-[14px] font-bold tabular-nums ${isToday ? 'text-accent' : 'text-foreground'}`}>
                {day}
              </span>
              {isToday && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-accent/10 text-accent uppercase tracking-wider">
                  hoje
                </span>
              )}
              <span className="text-[11px] text-muted ml-auto">
                {dayTasks.length} {dayTasks.length === 1 ? 'tarefa' : 'tarefas'}
              </span>
            </div>

            <div className="px-4 py-1.5">
              {dayTasks.map((task) => {
                const ps = getPersonStyle(task.primaryPerson);
                return (
                  <div
                    key={task.id}
                    className="py-1.5 flex items-center gap-2.5"
                    onClick={() => onEditTask?.(task)}
                  >
                    <span className="text-[10px]">{categoryDbIcon[task.category]}</span>
                    <span className="text-[13px] text-foreground flex-1 min-w-0 truncate">
                      {task.name}
                    </span>
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${ps.dot}`} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
