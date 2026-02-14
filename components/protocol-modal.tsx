'use client';

import { useState, useEffect } from 'react';
import { DbProtocol } from '@/lib/types';
import { ProtocolForm, ProtocolFormData } from './protocol-form';
import { ConfirmDialog } from './confirm-dialog';

interface Props {
  open: boolean;
  protocol: DbProtocol | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function ProtocolModal({ open, protocol, onClose, onSaved, onDeleted }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkedTaskCount, setLinkedTaskCount] = useState(0);
  const isEdit = protocol !== null;

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Fetch linked task count when opening delete confirm
  useEffect(() => {
    if (!showDeleteConfirm || !protocol) return;
    let cancelled = false;
    async function checkLinked() {
      try {
        const res = await fetch('/api/tasks');
        if (!res.ok) return;
        const allTasks = await res.json();
        const count = allTasks.filter((t: { protocolId: number | null }) => t.protocolId === protocol!.id).length;
        if (!cancelled) setLinkedTaskCount(count);
      } catch { /* ignore */ }
    }
    checkLinked();
    return () => { cancelled = true; };
  }, [showDeleteConfirm, protocol]);

  if (!open) return null;

  const handleSubmit = async (data: ProtocolFormData) => {
    const body = {
      name: data.name,
      trigger: data.trigger,
      actions: data.actions,
      color: data.color,
      icon: data.icon || null,
    };

    const url = isEdit ? `/api/protocols/${protocol.id}` : '/api/protocols';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(err.error || 'Falha ao salvar protocolo');
    }

    onSaved();
    onClose();
  };

  const handleDelete = async () => {
    if (!protocol) return;
    const res = await fetch(`/api/protocols/${protocol.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(err.error || 'Falha ao excluir');
    }
    setShowDeleteConfirm(false);
    onDeleted();
    onClose();
  };

  const initialData: ProtocolFormData | undefined = protocol
    ? {
        name: protocol.name,
        trigger: protocol.trigger,
        actions: protocol.actions,
        color: protocol.color,
        icon: protocol.icon || '',
      }
    : undefined;

  return (
    <>
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
            <h2 className="text-[16px] font-bold text-foreground">
              {isEdit ? 'Editar protocolo' : 'Novo protocolo'}
            </h2>
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
            <ProtocolForm
              initialData={initialData}
              onSubmit={handleSubmit}
              submitLabel={isEdit ? 'Salvar' : 'Criar'}
            />

            {/* Delete button (edit only) */}
            {isEdit && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full mt-4 py-3 rounded-2xl text-[14px] font-semibold text-red-500 bg-surface border border-border hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors tap-highlight"
              >
                Excluir protocolo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Excluir protocolo?"
        message={
          linkedTaskCount > 0
            ? `Este protocolo esta vinculado a ${linkedTaskCount} ${linkedTaskCount === 1 ? 'tarefa' : 'tarefas'}. Desvincular e excluir?`
            : 'Esta acao nao pode ser desfeita.'
        }
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        destructive
      />
    </>
  );
}
