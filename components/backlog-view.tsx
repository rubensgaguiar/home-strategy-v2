'use client';

import { tasks } from '@/lib/tasks';
import { Category, Person } from '@/lib/types';
import { categoryIcon, getPersonStyle } from '@/lib/helpers';

const backlogTasks = tasks.filter((t) => t.frequency === 'S');

function groupByCategory() {
  const map = new Map<Category, typeof backlogTasks>();
  for (const t of backlogTasks) {
    const list = map.get(t.category) ?? [];
    list.push(t);
    map.set(t.category, list);
  }
  return Array.from(map.entries());
}

export function BacklogView() {
  const grouped = groupByCategory();

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

      {/* Items */}
      <div className="space-y-3 stagger-children">
        {grouped.map(([category, items]) => (
          <div
            key={category}
            className="bg-surface rounded-2xl border border-border overflow-hidden"
          >
            {/* Category */}
            <div className="px-4 py-2.5 border-b border-border-subtle flex items-center gap-2">
              <span className="text-sm">{categoryIcon[category]}</span>
              <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                {category}
              </span>
            </div>

            {/* Tasks */}
            <div className="divide-y divide-border-subtle">
              {items.map((task) => {
                const ps = getPersonStyle(task.primary);
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
        ))}
      </div>

      {/* Footer note */}
      <div className="bg-surface-hover rounded-xl px-4 py-3">
        <p className="text-[11px] text-muted leading-relaxed text-center">
          Itens sem horario fixo. Aproveite momentos de folga para resolve-los.
        </p>
      </div>
    </div>
  );
}
