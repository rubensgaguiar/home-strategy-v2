'use client';

import { useEffect, useState, useCallback } from 'react';
import { useToast } from './toast';

interface NotificationPrefs {
  enabled: boolean;
  periodStart: boolean;
  periodEnd: boolean;
  dailySummary: boolean;
}

type PermissionStatus = 'default' | 'granted' | 'denied';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsView({ open, onClose }: Props) {
  const { showToast } = useToast();
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    enabled: false,
    periodStart: true,
    periodEnd: true,
    dailySummary: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('default');

  // Check browser permission status
  useEffect(() => {
    if (!open) return;
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission as PermissionStatus);
    }
  }, [open]);

  // Fetch preferences from API
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/notifications/preferences')
      .then((res) => res.json())
      .then((data) => setPrefs(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const savePrefs = useCallback(async (newPrefs: NotificationPrefs) => {
    setSaving(true);
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs),
      });
      setPrefs(newPrefs);
    } catch {
      showToast('Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  }, [showToast]);

  const handleToggleEnabled = useCallback(async () => {
    const newEnabled = !prefs.enabled;

    if (newEnabled) {
      // Request permission if not granted
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission as PermissionStatus);
        if (permission !== 'granted') {
          showToast('Permissao negada pelo navegador', 'error');
          return;
        }
      } else if ('Notification' in window && Notification.permission === 'denied') {
        showToast('Notificacoes bloqueadas pelo navegador', 'error');
        return;
      }

      // Subscribe to push
      try {
        const reg = await navigator.serviceWorker.ready;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) {
          showToast('VAPID key nao configurada', 'error');
          return;
        }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });

        const subJson = sub.toJSON();
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            keys: subJson.keys,
          }),
        });
      } catch {
        showToast('Erro ao ativar notificacoes', 'error');
        return;
      }
    } else {
      // Unsubscribe from push
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch('/api/notifications/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
      } catch {
        // Continue even if unsubscribe fails
      }
    }

    await savePrefs({ ...prefs, enabled: newEnabled });
    showToast(newEnabled ? 'Notificacoes ativadas' : 'Notificacoes desativadas');
  }, [prefs, savePrefs, showToast]);

  const handleToggle = useCallback((key: keyof Omit<NotificationPrefs, 'enabled'>) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    savePrefs(newPrefs);
  }, [prefs, savePrefs]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const permissionBadge = permissionStatus === 'granted'
    ? { label: 'Permitidas', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' }
    : permissionStatus === 'denied'
    ? { label: 'Bloqueadas', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' }
    : { label: 'Nao solicitadas', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };

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
          <h2 className="text-[16px] font-bold text-foreground">Configuracoes</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-surface-hover flex items-center justify-center text-muted hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-8 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Permission status */}
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-muted">Status do navegador:</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${permissionBadge.color}`}>
                  {permissionBadge.label}
                </span>
              </div>

              {permissionStatus === 'denied' && (
                <div className="px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/30 dark:border-red-800/20">
                  <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
                    As notificacoes estao bloqueadas pelo navegador. Para habilitar, acesse as configuracoes do seu navegador e permita notificacoes para este site.
                  </p>
                </div>
              )}

              {/* Main toggle */}
              <ToggleRow
                label="Ativar notificacoes"
                description="Receber lembretes no celular"
                checked={prefs.enabled}
                onChange={handleToggleEnabled}
                disabled={saving}
              />

              {/* Sub-toggles (only visible when enabled) */}
              {prefs.enabled && (
                <div className="ml-2 pl-3 border-l-2 border-border space-y-3 animate-slide-down">
                  <ToggleRow
                    label="Inicio de periodo"
                    description="06h, 12h, 18h — resumo das tarefas"
                    checked={prefs.periodStart}
                    onChange={() => handleToggle('periodStart')}
                    disabled={saving}
                  />
                  <ToggleRow
                    label="Fim de periodo"
                    description="11:30h, 17:30h, 21h — tarefas pendentes"
                    checked={prefs.periodEnd}
                    onChange={() => handleToggle('periodEnd')}
                    disabled={saving}
                  />
                  <ToggleRow
                    label="Resumo diario"
                    description="21:30h — porcentagem de conclusao"
                    checked={prefs.dailySummary}
                    onChange={() => handleToggle('dailySummary')}
                    disabled={saving}
                  />
                </div>
              )}

              {/* Schedule info */}
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <p className="text-[11px] text-muted leading-relaxed">
                  Horarios fixos (Brasilia): Manha 06h–12h, Tarde 12h–18h, Noite 18h–22h.
                  Os lembretes sao enviados no inicio e 30 min antes do fim de cada periodo.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange, disabled }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative shrink-0 w-10 h-6 rounded-full transition-colors duration-200 ${
          checked ? 'bg-accent' : 'bg-border'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

