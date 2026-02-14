'use client';

import { useState } from 'react';
import { CategoryDb, Person, Period, RecurrenceType } from '@/lib/types';
import { RecurrenceConfig, RecurrenceFormData } from './recurrence-config';

export interface TaskFormData {
  name: string;
  category: CategoryDb;
  primaryPerson: Person;
  secondaryPerson: Person | null;
  planB: string;
  optional: boolean;
  repetitions: string;
  protocolId: number | null;
  recurrence: RecurrenceFormData;
  steps: string[];
}

interface Props {
  initial?: Partial<TaskFormData>;
  onSubmit: (data: TaskFormData) => Promise<void>;
  submitLabel: string;
  isLoading?: boolean;
}

const CATEGORY_OPTIONS: { value: CategoryDb; label: string }[] = [
  { value: 'cozinha', label: 'Cozinha' },
  { value: 'pedro', label: 'Pedro' },
  { value: 'ester', label: 'Ester' },
  { value: 'casa', label: 'Casa' },
  { value: 'compras', label: 'Compras' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'espiritual', label: 'Espiritual' },
];

const PERSON_OPTIONS: { value: Person; label: string }[] = [
  { value: 'rubens', label: 'Rubens' },
  { value: 'diene', label: 'Diene' },
  { value: 'juntos', label: 'Juntos' },
];

const DEFAULT_RECURRENCE: RecurrenceFormData = {
  type: 'none',
  interval: 1,
  daysOfWeek: [],
  dayOfMonth: null,
  monthOfYear: null,
  weekOfMonth: null,
  periods: [],
};

export function TaskForm({ initial, onSubmit, submitLabel, isLoading }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<CategoryDb>(initial?.category ?? 'casa');
  const [primaryPerson, setPrimaryPerson] = useState<Person>(initial?.primaryPerson ?? 'rubens');
  const [secondaryPerson, setSecondaryPerson] = useState<Person | null>(initial?.secondaryPerson ?? null);
  const [planB, setPlanB] = useState(initial?.planB ?? '');
  const [optional, setOptional] = useState(initial?.optional ?? false);
  const [repetitions, setRepetitions] = useState(initial?.repetitions ?? '');
  const [recurrence, setRecurrence] = useState<RecurrenceFormData>(initial?.recurrence ?? DEFAULT_RECURRENCE);
  const [steps, setSteps] = useState<string[]>(initial?.steps ?? []);
  const [showAdvanced, setShowAdvanced] = useState(
    !!(initial?.secondaryPerson || initial?.planB || initial?.optional || (initial?.steps && initial.steps.length > 0) || initial?.repetitions)
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length < 2) {
      setError('Nome deve ter pelo menos 2 caracteres');
      return;
    }

    if (recurrence.type !== 'none' && recurrence.periods.length === 0) {
      setError('Selecione pelo menos um periodo');
      return;
    }

    await onSubmit({
      name: name.trim(),
      category,
      primaryPerson,
      secondaryPerson,
      planB: planB.trim() || '',
      optional,
      repetitions: repetitions.trim(),
      protocolId: initial?.protocolId ?? null,
      recurrence,
      steps: steps.filter((s) => s.trim().length > 0),
    });
  };

  const addStep = () => setSteps([...steps, '']);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  const updateStep = (i: number, val: string) => {
    const next = [...steps];
    next[i] = val;
    setSteps(next);
  };
  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    setSteps(next);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
          Nome *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da tarefa"
          className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-[14px] text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          autoFocus
        />
      </div>

      {/* Category + Person row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
            Categoria *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryDb)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-[13px] text-foreground styled-select"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
            Responsavel *
          </label>
          <select
            value={primaryPerson}
            onChange={(e) => setPrimaryPerson(e.target.value as Person)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-[13px] text-foreground styled-select"
          >
            {PERSON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Recurrence */}
      <RecurrenceConfig value={recurrence} onChange={setRecurrence} />

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1.5 text-[12px] text-muted hover:text-foreground transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        Opcoes adicionais
      </button>

      {/* Advanced fields */}
      {showAdvanced && (
        <div className="space-y-4 animate-slide-down">
          {/* Secondary person */}
          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
              Responsavel secundario
            </label>
            <select
              value={secondaryPerson ?? ''}
              onChange={(e) => setSecondaryPerson(e.target.value ? e.target.value as Person : null)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-[13px] text-foreground styled-select"
            >
              <option value="">Nenhum</option>
              {PERSON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Repetitions */}
          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
              Repeticoes
            </label>
            <input
              type="text"
              value={repetitions}
              onChange={(e) => setRepetitions(e.target.value)}
              placeholder="Ex: N vezes, 3x ao dia"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-[13px] text-foreground placeholder:text-muted/50"
            />
          </div>

          {/* Plan B */}
          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
              Plano B
            </label>
            <textarea
              value={planB}
              onChange={(e) => setPlanB(e.target.value)}
              placeholder="O que fazer se nao conseguir?"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface text-[13px] text-foreground placeholder:text-muted/50 resize-none"
            />
          </div>

          {/* Optional */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              className={`w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center transition-all ${
                optional ? 'bg-accent border-accent' : 'border-border'
              }`}
              onClick={() => setOptional(!optional)}
            >
              {optional && (
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-[13px] text-foreground">Tarefa opcional</span>
          </label>

          {/* Steps */}
          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
              Como fazer
            </label>
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[11px] text-muted font-semibold w-4 text-center shrink-0">{i + 1}</span>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  placeholder="Passo..."
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-input text-[12px] text-foreground placeholder:text-muted/50"
                />
                <button
                  type="button"
                  onClick={() => moveStep(i, -1)}
                  disabled={i === 0}
                  className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(i, 1)}
                  disabled={i === steps.length - 1}
                  className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="w-6 h-6 flex items-center justify-center rounded text-muted hover:text-red-500 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addStep}
              className="text-[12px] text-accent font-medium hover:underline mt-1"
            >
              + Adicionar passo
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/40 dark:border-red-800/30">
          <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 rounded-2xl text-[14px] font-semibold text-white bg-accent hover:brightness-110 active:scale-[0.98] shadow-sm shadow-accent/20 transition-all duration-150 tap-highlight disabled:opacity-50"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}
