'use client';

import { useState, useEffect } from 'react';
import { DbProtocol } from '@/lib/types';

const protocolConfig: Record<string, { icon: string; accent: string; step: string }> = {
  blue: {
    icon: '\u{1F372}',
    accent: 'border-l-sky-400 dark:border-l-sky-500',
    step: 'bg-sky-500',
  },
  amber: {
    icon: '\u{1F37D}\uFE0F',
    accent: 'border-l-amber-400 dark:border-l-amber-500',
    step: 'bg-amber-500',
  },
  violet: {
    icon: '\u{1F455}',
    accent: 'border-l-violet-400 dark:border-l-violet-500',
    step: 'bg-violet-500',
  },
  emerald: {
    icon: '\u{1F9F9}',
    accent: 'border-l-emerald-400 dark:border-l-emerald-500',
    step: 'bg-emerald-500',
  },
};

export function EmergencyView() {
  const [protocols, setProtocols] = useState<DbProtocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/protocols');
        if (!res.ok) throw new Error(`Failed to fetch protocols: ${res.status}`);
        const data: DbProtocol[] = await res.json();
        if (!cancelled) setProtocols(data);
      } catch (err) {
        console.error('Failed to load protocols:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="mb-2">
        <h2 className="text-lg font-bold text-foreground tracking-tight">
          Modo Sobrevivencia
        </h2>
        <p className="text-[13px] text-muted mt-0.5">
          Quando o dia esta dificil, siga o protocolo
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Protocols */}
      {!isLoading && (
        <div className="space-y-3 stagger-children">
          {protocols.map((protocol) => {
            const config = protocolConfig[protocol.color] || {
              icon: '\u{26A0}\uFE0F',
              accent: 'border-l-muted',
              step: 'bg-muted',
            };

            return (
              <div
                key={protocol.id}
                className={`bg-surface rounded-2xl border border-border border-l-[3px] ${config.accent} overflow-hidden`}
              >
                {/* Header */}
                <div className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{protocol.icon || config.icon}</span>
                    <div>
                      <h3 className="text-[14px] font-bold text-foreground tracking-tight">
                        {protocol.name}
                      </h3>
                      <p className="text-[11px] text-muted mt-0.5">
                        {protocol.trigger}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div className="px-4 pb-4">
                  <div className="space-y-2.5">
                    {protocol.actions.map((action, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span
                          className={`shrink-0 w-5 h-5 rounded-full ${config.step} text-white text-[10px] font-bold flex items-center justify-center mt-px`}
                        >
                          {i + 1}
                        </span>
                        <span className="text-[13px] text-foreground/80 leading-snug">
                          {action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Encouragement */}
      <div className="bg-amber-50/80 dark:bg-amber-950/20 rounded-2xl border border-amber-200/30 dark:border-amber-800/20 px-5 py-4 mt-4">
        <p className="text-[13px] text-amber-700 dark:text-amber-300 leading-relaxed text-center">
          <span className="font-semibold">Voces estao fazendo um otimo trabalho.</span>
          <br />
          <span className="text-amber-600/80 dark:text-amber-400/70 text-[12px]">
            Usar um protocolo nao e fracasso &mdash; e estrategia inteligente.
          </span>
        </p>
      </div>
    </div>
  );
}
