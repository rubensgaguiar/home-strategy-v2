'use client';

import { useState, useMemo, useCallback } from 'react';
import { TaskComplete, RecurrenceType, CategoryDb, Person, Period } from '@/lib/types';
import { categoryDisplayName } from '@/lib/types';
import { categoryDbIcon, getPersonStyle } from '@/lib/helpers';
import { describeRecurrence } from '@/lib/recurrence';

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

const PERIOD_OPTIONS: { id: Period; label: string; icon: string }[] = [
  { id: 'MA', label: 'Manha', icon: '☀️' },
  { id: 'TA', label: 'Tarde', icon: '🌤' },
  { id: 'NO', label: 'Noite', icon: '🌙' },
];

const ALL_PERIODS: Set<Period> = new Set(['MA', 'TA', 'NO']);

const freqBadgeStyle: Record<RecurrenceType, string> = {
  daily: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  weekly: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  monthly: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  yearly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  none: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function BacklogView({ tasks, isLoading, person, onEditTask }: Props) {
  // Default: exclude daily tasks from backlog
  const [freqFilters, setFreqFilters] = useState<Set<FreqFilter>>(
    new Set(['weekly', 'monthly', 'yearly', 'none'])
  );
  const [catFilters, setCatFilters] = useState<Set<CategoryDb>>(new Set(CATEGORY_OPTIONS));
  const [periodFilters, setPeriodFilters] = useState<Set<Period>>(new Set(ALL_PERIODS));
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const togglePeriod = useCallback((p: Period) => {
    setPeriodFilters((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
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
      // Period filter: inbox tasks (type === 'none') always pass
      if (t.recurrence.type !== 'none') {
        const taskPeriods = t.recurrence.periods ?? [];
        if (taskPeriods.length > 0) {
          const hasMatch = taskPeriods.some((p) => periodFilters.has(p as Period));
          if (!hasMatch) return false;
        }
      }
      return true;
    });
  }, [tasks, freqFilters, catFilters, periodFilters, person]);

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
    const hasSteps = task.steps && task.steps.length > 0;
    const hasProtocol = task.protocol !== null;

    return (
      <div
        key={task.id}
        className="px-4 py-2.5 cursor-pointer active:bg-surface-hover transition-colors"
        onClick={() => onEditTask?.(task)}
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
      </div>
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

      {/* Filters card (collapsible) */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        {/* Toggle header */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-full px-4 py-2.5 flex items-center gap-2 tap-highlight"
        >
          <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          <span className="text-[12px] font-semibold text-foreground">Filtros</span>
          {!filtersOpen && (freqFilters.size < FREQ_OPTIONS.length || catFilters.size < CATEGORY_OPTIONS.length || periodFilters.size < ALL_PERIODS.size) && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          )}
          <svg
            className={`w-3.5 h-3.5 text-muted ml-auto transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {filtersOpen && (
          <div className="animate-slide-down">
            <div className="mx-4 border-t border-border-subtle" />

            {/* Frequency section */}
            <div className="px-4 pt-2.5 pb-2.5">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Frequencia</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {FREQ_OPTIONS.map((f) => {
                  const isActive = freqFilters.has(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleFreq(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all tap-highlight ${
                        isActive
                          ? freqBadgeStyle[f.id]
                          : 'text-muted/50 border border-border-subtle'
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
            </div>

            <div className="mx-4 border-t border-border-subtle" />

            {/* Category section */}
            <div className="px-4 pt-2.5 pb-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Categoria</span>
                <button
                  onClick={() => {
                    if (catFilters.size === CATEGORY_OPTIONS.length) {
                      setCatFilters(new Set());
                    } else {
                      setCatFilters(new Set(CATEGORY_OPTIONS));
                    }
                  }}
                  className="text-[10px] font-semibold text-accent tap-highlight"
                >
                  {catFilters.size === CATEGORY_OPTIONS.length ? 'Limpar' : 'Todas'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {CATEGORY_OPTIONS.map((c) => {
                  const isActive = catFilters.has(c);
                  return (
                    <button
                      key={c}
                      onClick={() => toggleCat(c)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all tap-highlight flex items-center gap-1 ${
                        isActive
                          ? 'bg-foreground/10 text-foreground dark:bg-foreground/15'
                          : 'text-muted/50 border border-border-subtle'
                      }`}
                    >
                      <span className="text-[11px]">{categoryDbIcon[c]}</span>
                      {categoryDisplayName[c]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mx-4 border-t border-border-subtle" />

            {/* Period section */}
            <div className="px-4 pt-2.5 pb-3">
              <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Turno</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PERIOD_OPTIONS.map((p) => {
                  const isActive = periodFilters.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePeriod(p.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all tap-highlight flex items-center gap-1 ${
                        isActive
                          ? p.id === 'MA'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : p.id === 'TA'
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                            : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                          : 'text-muted/50 border border-border-subtle'
                      }`}
                    >
                      <span className="text-[11px]">{p.icon}</span>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
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
    </div>
  );
}
