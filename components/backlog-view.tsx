'use client';

import { useMemo } from 'react';
import { TaskComplete } from '@/lib/types';
import { categoryDisplayName } from '@/lib/types';
import { categoryDbIcon, getPersonStyle } from '@/lib/helpers';

interface Props {
  tasks: TaskComplete[];
  isLoading: boolean;
}

export function BacklogView({ tasks, isLoading }: Props) {
  // Backlog = tasks with recurrence type 'none' (previously frequency 'S')
  const backlogTasks = useMemo(() => {
    return tasks.filter((t) => t.recurrence.type === 'none');
  }, [tasks]);

  const grouped = useMemo(() => {
    const map = new Map<string, TaskComplete[]>();
    for (const t of backlogTasks) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return Array.from(map.entries());
  }, [backlogTasks]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-lg font-bold text-foreground tracking-tight">
          Pendencias
        </h2>
        <p className="text-[13px] text-muted mt-0.5">
          Para quando houver janela de oportunidade
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Items */}
      {!isLoading && (
        <div className="space-y-3 stagger-children">
          {grouped.map(([category, items]) => {
            const catKey = category as TaskComplete['category'];
            return (
              <div
                key={category}
                className="bg-surface rounded-2xl border border-border overflow-hidden"
              >
                {/* Category */}
                <div className="px-4 py-2.5 border-b border-border-subtle flex items-center gap-2">
                  <span className="text-sm">{categoryDbIcon[catKey]}</span>
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                    {categoryDisplayName[catKey]}
                  </span>
                </div>

                {/* Tasks */}
                <div className="divide-y divide-border-subtle">
                  {items.map((task) => {
                    const ps = getPersonStyle(task.primaryPerson);
                    return (
                      <div key={task.id} className="px-4 py-2.5 flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-border shrink-0" />
                        <span className="text-[13px] text-foreground/80 flex-1 min-w-0 truncate">
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

          {grouped.length === 0 && (
            <div className="text-center py-8">
              <p className="text-[13px] text-muted">Nenhuma pendencia cadastrada</p>
            </div>
          )}
        </div>
      )}

      {/* Footer note */}
      <div className="bg-surface-hover rounded-xl px-4 py-3">
        <p className="text-[11px] text-muted leading-relaxed text-center">
          Itens sem horario fixo. Aproveite momentos de folga para resolve-los.
        </p>
      </div>
    </div>
  );
}
