'use client';

import { useEffect } from 'react';
import { TaskForm, TaskFormData } from './task-form';
import { useToast } from './toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function TaskCreateModal({ open, onClose, onCreated }: Props) {
  const { showToast } = useToast();
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (data: TaskFormData) => {
    const body = {
      name: data.name,
      category: data.category,
      primaryPerson: data.primaryPerson,
      secondaryPerson: data.secondaryPerson,
      planB: data.planB || null,
      optional: data.optional,
      repetitions: data.repetitions || null,
      recurrence: {
        type: data.recurrence.type,
        interval: data.recurrence.interval,
        daysOfWeek: data.recurrence.daysOfWeek.length > 0 ? data.recurrence.daysOfWeek : null,
        dayOfMonth: data.recurrence.dayOfMonth,
        monthOfYear: data.recurrence.monthOfYear,
        weekOfMonth: data.recurrence.weekOfMonth,
        periods: data.recurrence.periods,
      },
      steps: data.steps.map((s) => ({ description: s })),
    };

    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(err.error || 'Falha ao criar tarefa');
    }

    showToast('Tarefa criada');
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-surface rounded-t-3xl border-t border-border shadow-xl animate-slide-up overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-foreground">Nova tarefa</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-surface-hover flex items-center justify-center text-muted hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="px-5 pb-8 overflow-y-auto max-h-[calc(90vh-80px)]">
          <TaskForm onSubmit={handleSubmit} submitLabel="Criar" />
        </div>
      </div>
    </div>
  );
}
