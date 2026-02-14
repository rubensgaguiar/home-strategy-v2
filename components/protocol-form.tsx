'use client';

import { useState } from 'react';

export interface ProtocolFormData {
  name: string;
  trigger: string;
  actions: string[];
  color: string;
  icon: string;
}

interface Props {
  initialData?: ProtocolFormData;
  onSubmit: (data: ProtocolFormData) => Promise<void>;
  submitLabel: string;
}

const COLORS = [
  { id: 'blue', bg: 'bg-sky-500', ring: 'ring-sky-400' },
  { id: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-400' },
  { id: 'violet', bg: 'bg-violet-500', ring: 'ring-violet-400' },
  { id: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-400' },
  { id: 'red', bg: 'bg-red-500', ring: 'ring-red-400' },
  { id: 'pink', bg: 'bg-pink-500', ring: 'ring-pink-400' },
  { id: 'indigo', bg: 'bg-indigo-500', ring: 'ring-indigo-400' },
  { id: 'gray', bg: 'bg-gray-500', ring: 'ring-gray-400' },
];

export function ProtocolForm({ initialData, onSubmit, submitLabel }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [trigger, setTrigger] = useState(initialData?.trigger ?? '');
  const [actions, setActions] = useState<string[]>(initialData?.actions ?? ['']);
  const [color, setColor] = useState(initialData?.color ?? 'blue');
  const [icon, setIcon] = useState(initialData?.icon ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isValid = name.trim().length >= 2 && trigger.trim().length >= 2 && actions.some((a) => a.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        trigger: trigger.trim(),
        actions: actions.filter((a) => a.trim()),
        color,
        icon: icon.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
          Nome
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Protocolo Cozinha Minima"
          className="w-full px-3.5 py-2.5 rounded-xl bg-surface-hover border border-border text-[14px] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Trigger */}
      <div>
        <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
          Gatilho
        </label>
        <textarea
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="Quando usar este protocolo?"
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl bg-surface-hover border border-border text-[14px] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
        />
      </div>

      {/* Icon */}
      <div>
        <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
          Icone (emoji, opcional)
        </label>
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="Ex: \u{1F372}"
          className="w-20 px-3.5 py-2.5 rounded-xl bg-surface-hover border border-border text-[14px] text-center text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Color */}
      <div>
        <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
          Cor
        </label>
        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.id)}
              className={`w-7 h-7 rounded-full ${c.bg} transition-all ${
                color === c.id ? `ring-2 ${c.ring} ring-offset-2 ring-offset-surface` : ''
              }`}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div>
        <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1.5">
          Acoes
        </label>
        <div className="space-y-2">
          {actions.map((action, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-muted tabular-nums w-5 text-center">{i + 1}</span>
              <input
                type="text"
                value={action}
                onChange={(e) => {
                  const newActions = [...actions];
                  newActions[i] = e.target.value;
                  setActions(newActions);
                }}
                placeholder={`Acao ${i + 1}`}
                className="flex-1 px-3 py-2 rounded-lg bg-surface-hover border border-border text-[13px] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              {actions.length > 1 && (
                <button
                  type="button"
                  onClick={() => setActions(actions.filter((_, j) => j !== i))}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const newActions = [...actions];
                    [newActions[i - 1], newActions[i]] = [newActions[i], newActions[i - 1]];
                    setActions(newActions);
                  }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-foreground transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setActions([...actions, ''])}
          className="mt-2 text-[12px] font-medium text-accent hover:underline"
        >
          + Adicionar acao
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-3.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200/40 dark:border-red-800/30">
          <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || isSubmitting}
        className="w-full py-3 rounded-2xl text-[14px] font-semibold text-white bg-accent hover:brightness-110 active:scale-[0.98] shadow-sm shadow-accent/20 transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none tap-highlight"
      >
        {isSubmitting ? 'Salvando...' : submitLabel}
      </button>
    </form>
  );
}
