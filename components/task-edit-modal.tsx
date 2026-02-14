'use client';

import { useEffect, useState } from 'react';
import { TaskComplete } from '@/lib/types';
import { TaskForm, TaskFormData } from './task-form';
import { ConfirmDialog } from './confirm-dialog';
import { RecurrenceFormData } from './recurrence-config';

interface Props {
  open: boolean;
  task: TaskComplete | null;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

function taskToFormData(task: TaskComplete): Partial<TaskFormData> {
  const rec = task.recurrence;
  const recurrence: RecurrenceFormData = {
    type: rec.type,
    interval: rec.interval,
    daysOfWeek: rec.daysOfWeek ?? [],
    dayOfMonth: rec.dayOfMonth,
    monthOfYear: rec.monthOfYear,
    weekOfMonth: rec.weekOfMonth,
    periods: (rec.periods ?? []) as RecurrenceFormData['periods'],
  };

  return {
    name: task.name,
    category: task.category,
    primaryPerson: task.primaryPerson,
    secondaryPerson: task.secondaryPerson,
    planB: task.planB ?? '',
    optional: task.optional,
    repetitions: task.repetitions ?? '',
    protocolId: task.protocolId,
    recurrence,
    steps: task.steps.map((s) => s.description),
  };
}

export function TaskEditModal({ open, task, onClose, onUpdated, onDeleted }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose, showDeleteConfirm]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !task) return null;

  const handleSubmit = async (data: TaskFormData) => {
    const body = {
      name: data.name,
      category: data.category,
      primaryPerson: data.primaryPerson,
      secondaryPerson: data.secondaryPerson,
      planB: data.planB || null,
      optional: data.optional,
      repetitions: data.repetitions || null,
      protocolId: data.protocolId,
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

    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(err.error || 'Falha ao atualizar tarefa');
    }

    onUpdated();
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao excluir tarefa');
      onDeleted();
      onClose();
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
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
          <h2 className="text-[16px] font-bold text-foreground">Editar tarefa</h2>
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
        <div className="px-5 pb-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          <TaskForm
            initial={taskToFormData(task)}
            onSubmit={handleSubmit}
            submitLabel="Salvar"
          />
        </div>

        {/* Delete button */}
        <div className="px-5 pb-8 border-t border-border-subtle pt-3">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors tap-highlight"
          >
            Excluir tarefa
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Excluir tarefa"
        message="Tem certeza? O historico de completions sera mantido."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
