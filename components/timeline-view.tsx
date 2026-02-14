'use client';

import { useState, useCallback } from 'react';
import { TaskComplete, CompletionStatus, Period, Person } from '@/lib/types';
import { categoryDisplayName } from '@/lib/types';
import {
  PERIODS,
  categoryDbIcon,
  getPersonStyle,
  getCurrentPeriod,
  filterByPeriodDb,
  filterByPersonDb,
  getPlanBDb,
} from '@/lib/helpers';
import { useLongPress } from '@/lib/hooks/use-long-press';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  tasks: TaskComplete[];
  isToday: boolean;
  person: Person | 'todos';
  isChecked: (taskId: number) => boolean;
  getStatus: (taskId: number) => CompletionStatus | null;
  onMarkDone: (taskId: number) => void;
  onMarkNotDone: (taskId: number) => void;
  onUndo: (taskId: number) => void;
  onEditTask?: (task: TaskComplete) => void;
}

function TaskRow({ task, children, onEdit }: { task: TaskComplete; children: React.ReactNode; onEdit?: (task: TaskComplete) => void }) {
  const handlers = useLongPress(() => onEdit?.(task));
  return <div {...handlers}>{children}</div>;
}

function SortableTaskItem({ task, children }: { task: TaskComplete; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-start">
        {/* Drag handle */}
        <button
          {...listeners}
          className="shrink-0 w-5 h-full flex items-center justify-center text-muted/40 hover:text-muted cursor-grab active:cursor-grabbing touch-none pt-2.5"
        >
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

const periodAccent: Record<Period, { line: string; dot: string; header: string }> = {
  MA: {
    line: 'bg-amber-300 dark:bg-amber-600',
    dot: 'bg-amber-400 dark:bg-amber-500',
    header: 'text-amber-600 dark:text-amber-400',
  },
  TA: {
    line: 'bg-sky-300 dark:bg-sky-600',
    dot: 'bg-sky-400 dark:bg-sky-500',
    header: 'text-sky-600 dark:text-sky-400',
  },
  NO: {
    line: 'bg-violet-300 dark:bg-violet-600',
    dot: 'bg-violet-400 dark:bg-violet-500',
    header: 'text-violet-600 dark:text-violet-400',
  },
};

export function TimelineView({ tasks, isToday, person, isChecked, getStatus, onMarkDone, onMarkNotDone, onUndo, onEditTask }: Props) {
  const currentPeriod = isToday ? getCurrentPeriod() : null;
  const [collapsedPeriods, setCollapsedPeriods] = useState<Set<Period>>(new Set());
  const [expandedPlanB, setExpandedPlanB] = useState<number | null>(null);
  const [localOrder, setLocalOrder] = useState<Map<Period, number[]>>(new Map());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function toggleCollapse(period: Period) {
    setCollapsedPeriods((prev) => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period);
      else next.add(period);
      return next;
    });
  }

  const personTasks = filterByPersonDb(tasks, person);

  const handleDragEnd = useCallback((period: Period, periodTasks: TaskComplete[]) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = periodTasks.findIndex((t) => t.id === active.id);
    const newIndex = periodTasks.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(periodTasks, oldIndex, newIndex);
    const newOrder = reordered.map((t) => t.id);
    setLocalOrder((prev) => new Map(prev).set(period, newOrder));

    // Persist to API
    const reorderPayload = reordered.map((t, i) => ({ task_id: t.id, sort_order: i }));
    fetch('/api/tasks/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reorderPayload),
    }).catch(console.error);
  }, []);

  function getOrderedTasks(periodId: Period, periodTasks: TaskComplete[]): TaskComplete[] {
    const order = localOrder.get(periodId);
    if (!order) return periodTasks;
    const taskMap = new Map(periodTasks.map((t) => [t.id, t]));
    const ordered: TaskComplete[] = [];
    for (const id of order) {
      const t = taskMap.get(id);
      if (t) ordered.push(t);
    }
    // Add any tasks not in the saved order (new tasks)
    for (const t of periodTasks) {
      if (!order.includes(t.id)) ordered.push(t);
    }
    return ordered;
  }

  return (
    <div className="space-y-3 stagger-children">
      {PERIODS.map((period) => {
        const rawPeriodTasks = filterByPeriodDb(personTasks, period.id);
        const periodTasks = getOrderedTasks(period.id, rawPeriodTasks);
        const isCurrent = currentPeriod === period.id;
        const isCollapsed = collapsedPeriods.has(period.id);
        const accent = periodAccent[period.id];

        const doneCount = periodTasks.filter((t) => isChecked(t.id)).length;
        const totalCount = periodTasks.length;

        return (
          <div key={period.id} className="bg-surface rounded-2xl border border-border overflow-hidden">
            {/* Header */}
            <button
              onClick={() => toggleCollapse(period.id)}
              className="w-full px-4 py-3 flex items-center gap-3 tap-highlight"
            >
              <div className="flex flex-col items-center gap-0.5">
                <div className={`w-2.5 h-2.5 rounded-full ${accent.dot} ${isCurrent ? 'animate-pulse-soft ring-4 ring-accent/20' : ''}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm leading-none">{period.icon}</span>
                  <span className={`text-[13px] font-bold ${accent.header}`}>
                    {period.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-accent/10 text-accent uppercase tracking-wider">
                      agora
                    </span>
                  )}
                  <span className="text-[11px] text-muted ml-auto tabular-nums">
                    {period.time}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-muted tabular-nums">
                  {doneCount}/{totalCount}
                </span>
                <div className="w-8 h-1 bg-border-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : '0%' }}
                  />
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Tasks */}
            {!isCollapsed && (
              <div className="animate-slide-down">
                {periodTasks.length === 0 && (
                  <div className="px-4 py-4 text-center">
                    <p className="text-[12px] text-muted">Sem tarefas neste periodo</p>
                  </div>
                )}
                {periodTasks.length > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd(period.id, periodTasks)}
                  >
                    <SortableContext
                      items={periodTasks.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="px-2 pb-2">
                        {periodTasks.map((task) => {
                          const status = getStatus(task.id);
                          const checked = status === 'done';
                          const notDone = status === 'not_done';
                          const ps = getPersonStyle(task.primaryPerson);
                          const planBExpanded = expandedPlanB === task.id;

                          return (
                            <SortableTaskItem key={task.id} task={task}>
                              <TaskRow task={task} onEdit={onEditTask}>
                                <div className="py-1.5 pl-1">
                                <div className="flex items-center gap-2.5 group">
                                  <button
                                    onClick={() => {
                                      if (status === null) {
                                        onMarkDone(task.id);
                                      } else {
                                        onUndo(task.id);
                                      }
                                    }}
                                    className={`shrink-0 w-[18px] h-[18px] rounded-md border-[1.5px] flex items-center justify-center transition-all duration-150 ${
                                      checked
                                        ? 'bg-accent border-accent animate-check-pop'
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

                                  <span
                                    className={`text-[13px] flex-1 min-w-0 truncate leading-snug transition-all duration-200 ${
                                      checked
                                        ? 'text-muted line-through'
                                        : notDone
                                        ? 'text-red-400 dark:text-red-500 line-through'
                                        : task.optional
                                        ? 'text-muted italic'
                                        : 'text-foreground'
                                    }`}
                                  >
                                    {task.name}
                                    {task.repetitions && (
                                      <span className="text-[10px] text-muted ml-1">{task.repetitions}</span>
                                    )}
                                    {task.optional && (
                                      <span className="text-[9px] text-muted ml-1 not-italic uppercase font-medium">
                                        opc
                                      </span>
                                    )}
                                  </span>

                                  {/* Category icon */}
                                  <span className="text-[10px] shrink-0">{categoryDbIcon[task.category]}</span>

                                  {/* Steps indicator */}
                                  {task.steps && task.steps.length > 0 && (
                                    <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">
                                      como
                                    </span>
                                  )}

                                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${ps.dot}`} />

                                  <button
                                    onClick={() => setExpandedPlanB(planBExpanded ? null : task.id)}
                                    className={`shrink-0 w-5 h-5 flex items-center justify-center rounded-md transition-all duration-150 ${
                                      planBExpanded
                                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                                        : 'text-muted/0 group-hover:text-muted hover:text-amber-500 dark:hover:text-amber-400'
                                    }`}
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </button>
                                </div>

                                {status === null && (
                                  <div className="mt-1 ml-7 flex gap-1.5">
                                    <button
                                      onClick={() => onMarkDone(task.id)}
                                      className="text-[10px] font-medium text-accent hover:underline"
                                    >
                                      Feito
                                    </button>
                                    <span className="text-border">&middot;</span>
                                    <button
                                      onClick={() => onMarkNotDone(task.id)}
                                      className="text-[10px] font-medium text-red-500 dark:text-red-400 hover:underline"
                                    >
                                      Nao feito
                                    </button>
                                  </div>
                                )}

                                {planBExpanded && (
                                  <div className="mt-1.5 ml-7 animate-slide-down">
                                    <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/30 dark:border-amber-800/20">
                                      <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
                                        {getPlanBDb(task)}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              </TaskRow>
                            </SortableTaskItem>
                          );
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
