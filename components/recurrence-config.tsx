'use client';

import { RecurrenceType, Period } from '@/lib/types';
import { describeRecurrence } from '@/lib/recurrence';

export interface RecurrenceFormData {
  type: RecurrenceType;
  interval: number;
  daysOfWeek: number[];
  dayOfMonth: number | null;
  monthOfYear: number | null;
  weekOfMonth: number | null;
  periods: Period[];
}

interface Props {
  value: RecurrenceFormData;
  onChange: (value: RecurrenceFormData) => void;
}

const TYPE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
  { value: 'none', label: 'Sem data' },
];

const DAY_CHIPS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
];

const PERIOD_CHIPS: { value: Period; label: string }[] = [
  { value: 'MA', label: 'Manha' },
  { value: 'TA', label: 'Tarde' },
  { value: 'NO', label: 'Noite' },
];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function RecurrenceConfig({ value, onChange }: Props) {
  const update = (partial: Partial<RecurrenceFormData>) => {
    onChange({ ...value, ...partial });
  };

  const toggleDayOfWeek = (day: number) => {
    const next = value.daysOfWeek.includes(day)
      ? value.daysOfWeek.filter((d) => d !== day)
      : [...value.daysOfWeek, day].sort();
    update({ daysOfWeek: next });
  };

  const togglePeriod = (period: Period) => {
    const next = value.periods.includes(period)
      ? value.periods.filter((p) => p !== period)
      : [...value.periods, period];
    update({ periods: next });
  };

  const useWeekOfMonth = value.weekOfMonth != null;

  const preview = describeRecurrence({
    type: value.type,
    interval: value.interval,
    daysOfWeek: value.daysOfWeek.length > 0 ? value.daysOfWeek : null,
    dayOfMonth: value.dayOfMonth,
    monthOfYear: value.monthOfYear,
    weekOfMonth: value.weekOfMonth,
  });

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div>
        <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
          Frequencia
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                const reset: Partial<RecurrenceFormData> = { type: opt.value };
                if (opt.value === 'none') {
                  reset.daysOfWeek = [];
                  reset.dayOfMonth = null;
                  reset.monthOfYear = null;
                  reset.weekOfMonth = null;
                  reset.periods = [];
                  reset.interval = 1;
                }
                update(reset);
              }}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-150 tap-highlight ${
                value.type === opt.value
                  ? 'bg-accent text-white'
                  : 'bg-surface-hover text-muted border border-border'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Periods (not for 'none') */}
      {value.type !== 'none' && (
        <div>
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
            Periodo do dia
          </label>
          <div className="flex gap-1.5">
            {PERIOD_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => togglePeriod(chip.value)}
                className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150 tap-highlight ${
                  value.periods.includes(chip.value)
                    ? 'bg-accent text-white'
                    : 'bg-surface-hover text-muted border border-border'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Daily: interval */}
      {value.type === 'daily' && (
        <div>
          <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
            Intervalo
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted">A cada</span>
            <input
              type="number"
              min={1}
              max={365}
              value={value.interval}
              onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-16 px-2 py-1.5 rounded-lg border border-border bg-surface text-[13px] text-foreground text-center"
            />
            <span className="text-[12px] text-muted">dia(s)</span>
          </div>
        </div>
      )}

      {/* Weekly: days of week + interval */}
      {value.type === 'weekly' && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
              Dias da semana
            </label>
            <div className="flex gap-1">
              {DAY_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => toggleDayOfWeek(chip.value)}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 tap-highlight ${
                    value.daysOfWeek.includes(chip.value)
                      ? 'bg-accent text-white'
                      : 'bg-surface-hover text-muted border border-border'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
              Intervalo
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted">A cada</span>
              <input
                type="number"
                min={1}
                max={52}
                value={value.interval}
                onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-16 px-2 py-1.5 rounded-lg border border-border bg-surface text-[13px] text-foreground text-center"
              />
              <span className="text-[12px] text-muted">semana(s)</span>
            </div>
          </div>
        </>
      )}

      {/* Monthly: day of month or week of month + interval */}
      {value.type === 'monthly' && (
        <>
          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
              Tipo
            </label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => update({ weekOfMonth: null, dayOfMonth: value.dayOfMonth ?? 1 })}
                className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150 tap-highlight ${
                  !useWeekOfMonth
                    ? 'bg-accent text-white'
                    : 'bg-surface-hover text-muted border border-border'
                }`}
              >
                Dia do mes
              </button>
              <button
                type="button"
                onClick={() => update({ dayOfMonth: null, weekOfMonth: value.weekOfMonth ?? 1, daysOfWeek: value.daysOfWeek.length ? value.daysOfWeek : [1] })}
                className={`flex-1 py-2 rounded-xl text-[12px] font-semibold transition-all duration-150 tap-highlight ${
                  useWeekOfMonth
                    ? 'bg-accent text-white'
                    : 'bg-surface-hover text-muted border border-border'
                }`}
              >
                Semana do mes
              </button>
            </div>
          </div>

          {!useWeekOfMonth && (
            <div>
              <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
                Dia
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={value.dayOfMonth ?? 1}
                onChange={(e) => update({ dayOfMonth: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) })}
                className="w-20 px-2 py-1.5 rounded-lg border border-border bg-surface text-[13px] text-foreground text-center"
              />
            </div>
          )}

          {useWeekOfMonth && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
                  Ocorrencia
                </label>
                <select
                  value={value.weekOfMonth ?? 1}
                  onChange={(e) => update({ weekOfMonth: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-[13px] text-foreground"
                >
                  <option value={1}>1o</option>
                  <option value={2}>2o</option>
                  <option value={3}>3o</option>
                  <option value={4}>4o</option>
                  <option value={5}>5o</option>
                  <option value={-1}>Ultimo</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
                  Dia da semana
                </label>
                <div className="flex gap-1">
                  {DAY_CHIPS.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => update({ daysOfWeek: [chip.value] })}
                      className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all duration-150 tap-highlight ${
                        value.daysOfWeek.includes(chip.value)
                          ? 'bg-accent text-white'
                          : 'bg-surface-hover text-muted border border-border'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
              Intervalo
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-muted">A cada</span>
              <input
                type="number"
                min={1}
                max={12}
                value={value.interval}
                onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-16 px-2 py-1.5 rounded-lg border border-border bg-surface text-[13px] text-foreground text-center"
              />
              <span className="text-[12px] text-muted">mes(es)</span>
            </div>
          </div>
        </>
      )}

      {/* Yearly: month + day */}
      {value.type === 'yearly' && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
              Mes
            </label>
            <select
              value={value.monthOfYear ?? 1}
              onChange={(e) => update({ monthOfYear: parseInt(e.target.value) })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-[13px] text-foreground"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <label className="text-[11px] font-semibold text-muted uppercase tracking-wider block mb-1.5">
              Dia
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={value.dayOfMonth ?? 1}
              onChange={(e) => update({ dayOfMonth: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)) })}
              className="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-[13px] text-foreground text-center"
            />
          </div>
        </div>
      )}

      {/* Preview */}
      {value.type !== 'none' && preview && (
        <div className="px-3 py-2 rounded-xl bg-accent/10 border border-accent/20">
          <p className="text-[12px] text-accent font-medium">{preview}</p>
        </div>
      )}
    </div>
  );
}
