'use client';

import { useState, useMemo, useCallback } from 'react';
import { TaskComplete, RecurrenceType, CategoryDb, Person } from '@/lib/types';
import { categoryDisplayName } from '@/lib/types';
import { categoryDbIcon, getPersonStyle } from '@/lib/helpers';
import { describeRecurrence } from '@/lib/recurrence';
import { useLongPress } from '@/lib/hooks/use-long-press';

interface Props {
  tasks: TaskComplete[];
  isLoading: boolean;
  person: Person | 'todos';
  onEditTask?: (task: TaskComplete) => void;
}

type FreqFilter = RecurrenceType;

const FREQ_OPTIONS: { id: FreqFilter; label: string }[] = [
  { id: 'daily', label: 'Diaria' },
  { id: 'weekly', label: 'Semanal' },
  { id: 'monthly', label: 'Mensal' },
  { id: 'yearly', label: 'Anual' },
  { id: 'none', label: 'Sem data' },
];

const CATEGORY_OPTIONS: CategoryDb[] = [
  'cozinha', 'pedro', 'ester', 'casa', 'pessoal', 'espiritual', 'compras',
];

const freqBadgeStyle: Record<RecurrenceType, string> = {
  daily: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  weekly: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  monthly: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  yearly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  none: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function BacklogTaskRow({ task, children, onEdit }: { task: TaskComplete; children: React.ReactNode; onEdit?: (task: TaskComplete) => void }) {
  const handlers = useLongPress(() => onEdit?.(task));
  return <div {...handlers}>{children}</div>;
}

export function BacklogView({ tasks, isLoading, person, onEditTask }: Props) {
  // Default: exclude daily tasks from backlog
  const [freqFilters, setFreqFilters] = useState<Set<FreqFilter>>(
    new Set(['weekly', 'monthly', 'yearly', 'none'])
  );
  const [catFilters, setCatFilters] = useState<Set<CategoryDb>>(new Set(CATEGORY_OPTIONS));
  const [expandedTask, setExpandedTask] = useState<number | null>(null);

  const toggleFreq = useCallback((f: FreqFilter) => {
    setFreqFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  }, []);

  const toggleCat = useCallback((c: CategoryDb) => {
    setCatFilters((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (!freqFilters.has(t.recurrence.type)) return false;
      if (!catFilters.has(t.category)) return false;
      if (person !== 'todos') {
        if (t.primaryPerson !== person && t.primaryPerson !== 'juntos') return false;
      }
      return true;
    });
  }, [tasks, freqFilters, catFilters, person]);

  // Inbox tasks (recurrence.type === 'none')
  const inboxTasks = useMemo(() => filtered.filter((t) => t.recurrence.type === 'none'), [filtered]);
  const scheduledTasks = useMemo(() => filtered.filter((t) => t.recurrence.type !== 'none'), [filtered]);

  // Group scheduled tasks by category
  const grouped = useMemo(() => {
    const map = new Map<CategoryDb, TaskComplete[]>();
    for (const t of scheduledTasks) {
      const list = map.get(t.category) ?? [];
      list.push(t);
      map.set(t.category, list);
    }
    return Array.from(map.entries());
  }, [scheduledTasks]);

  // Inbox count (unfiltered)
  const inboxCount = useMemo(() => tasks.filter((t) => t.recurrence.type === 'none').length, [tasks]);

  function renderTask(task: TaskComplete) {
    const ps = getPersonStyle(task.primaryPerson);
    const recDesc = describeRecurrence(task.recurrence);
    const isExpanded = expandedTask === task.id;
    const hasSteps = task.steps && task.steps.length > 0;
    const hasProtocol = task.protocol !== null;

    return (
      <BacklogTaskRow key={task.id} task={task} onEdit={onEditTask}>
        <div
          className="px-4 py-2.5 cursor-pointer"
          onClick={() => setExpandedTask(isExpanded ? null : task.id)}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-border shrink-0" />
            <span className="text-[13px] text-foreground/80 flex-1 min-w-0 truncate">
              {task.name}
            </span>
            {hasSteps && (
              <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">
                como
              </span>
            )}
            {hasProtocol && (
              <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                SOS
              </span>
            )}
            <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${freqBadgeStyle[task.recurrence.type]}`}>
              {recDesc}
            </span>
            <span className={`shrink-0 w-2 h-2 rounded-full ${ps.dot}`} />
          </div>

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-2 ml-4 space-y-2 animate-slide-down">
              {hasSteps && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Passos</span>
                  {task.steps.map((step, i) => (
                    <div key={step.id} className="flex items-start gap-2">
                      <span className="text-[10px] text-muted font-bold tabular-nums">{i + 1}.</span>
                      <span className="text-[12px] text-foreground/70">{step.description}</span>
                    </div>
                  ))}
                </div>
              )}
              {task.planB && (
                <div>
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Plano B</span>
                  <p className="text-[12px] text-amber-600 dark:text-amber-400 mt-0.5">{task.planB}</p>
                </div>
              )}
              {hasProtocol && (
                <div>
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Protocolo</span>
                  <p className="text-[12px] text-emerald-600 dark:text-emerald-400 mt-0.5">{task.protocol!.name}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </BacklogTaskRow>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-lg font-bold text-foreground tracking-tight">
          Backlog
        </h2>
        <p className="text-[13px] text-muted mt-0.5">
          Todas as tarefas &middot; {filtered.length} {filtered.length === 1 ? 'tarefa' : 'tarefas'}
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {FREQ_OPTIONS.map((f) => {
            const isActive = freqFilters.has(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggleFreq(f.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all tap-highlight ${
                  isActive
                    ? freqBadgeStyle[f.id]
                    : 'text-muted/80 bg-surface-hover border border-border-subtle'
                }`}
              >
                {f.label}
                {f.id === 'none' && inboxCount > 0 && (
                  <span className="ml-1 px-1 py-0 rounded-full bg-red-500 text-white text-[9px] font-bold">
                    {inboxCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1">
          {CATEGORY_OPTIONS.map((c) => {
            const isActive = catFilters.has(c);
            return (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all tap-highlight flex items-center gap-1 ${
                  isActive
                    ? 'bg-surface text-foreground border border-border'
                    : 'text-muted/80 bg-surface-hover border border-border-subtle'
                }`}
              >
                <span className="text-[12px]">{categoryDbIcon[c]}</span>
                {categoryDisplayName[c]}
              </button>
            );
          })}
          <button
            onClick={() => {
              if (catFilters.size === CATEGORY_OPTIONS.length) {
                setCatFilters(new Set());
              } else {
                setCatFilters(new Set(CATEGORY_OPTIONS));
              }
            }}
            className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all tap-highlight text-accent border border-accent/30 bg-accent/5"
          >
            {catFilters.size === CATEGORY_OPTIONS.length ? 'Limpar' : 'Todas'}
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <div className="space-y-3 stagger-children">
          {/* Inbox section */}
          {freqFilters.has('none') && inboxTasks.length > 0 && (
            <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/40 dark:border-amber-800/20 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-amber-200/30 dark:border-amber-800/20 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162M3.375 2.25c-.621 0-1.125.504-1.125 1.125v15.75c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125V3.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
                <span className="text-[12px] font-bold text-amber-700 dark:text-amber-300">
                  Inbox
                </span>
                <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70 ml-auto">
                  {inboxTasks.length} {inboxTasks.length === 1 ? 'item' : 'itens'} sem data
                </span>
              </div>
              <div className="divide-y divide-amber-200/20 dark:divide-amber-800/20">
                {inboxTasks.map(renderTask)}
              </div>
            </div>
          )}

          {/* Scheduled tasks grouped by category */}
          {grouped.map(([category, items]) => (
            <div
              key={category}
              className="bg-surface rounded-2xl border border-border overflow-hidden"
            >
              <div className="px-4 py-2.5 border-b border-border-subtle flex items-center gap-2">
                <span className="text-sm">{categoryDbIcon[category]}</span>
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                  {categoryDisplayName[category]}
                </span>
                <span className="text-[10px] text-muted ml-auto">{items.length}</span>
              </div>
              <div className="divide-y divide-border-subtle">
                {items.map(renderTask)}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xl mb-2">🔍</p>
              <p className="text-[13px] text-muted">Nenhuma tarefa encontrada com estes filtros</p>
            </div>
          )}
        </div>
      )}

      {/* Footer note */}
      <div className="bg-surface-hover rounded-xl px-4 py-3">
        <p className="text-[11px] text-muted leading-relaxed text-center">
          Toque longo para editar. Toque para expandir detalhes.
        </p>
      </div>
    </div>
  );
}
