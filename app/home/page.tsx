'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { DayOfWeek, Person } from '@/lib/types';
import {
  DAYS, DAY_SHORT, DAY_LABELS, getTodayDayOfWeek, getGreeting,
  getDateForDay, formatDate, getDbTasksForDate, filterByPersonDb, getDbDayStats,
} from '@/lib/helpers';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useCompletions } from '@/lib/hooks/use-completions';
import { UserMenu } from '@/components/user-menu';
import { FocusView } from '@/components/focus-view';
import { TimelineView } from '@/components/timeline-view';
import { EmergencyView } from '@/components/emergency-view';
import { BacklogView } from '@/components/backlog-view';

const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true';

type Tab = 'dia' | 'emergencia' | 'pendencias';
type ViewMode = 'foco' | 'lista';
type PersonFilter = Person | 'todos';

function useCurrentPerson(): Person | null {
  const { data: session } = useSession();
  if (authDisabled) return null;
  const email = session?.user?.email?.toLowerCase() ?? '';
  if (email.includes('rubens')) return 'rubens';
  if (email.includes('diene')) return 'diene';
  return null;
}

export default function HomePage() {
  const todayDay = getTodayDayOfWeek();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);
  const [activeTab, setActiveTab] = useState<Tab>('dia');
  const [viewMode, setViewMode] = useState<ViewMode>('foco');

  const detectedPerson = useCurrentPerson();
  const [personFilter, setPersonFilter] = useState<PersonFilter>(detectedPerson ?? 'todos');

  // API-backed data
  const { tasks, isLoading: tasksLoading } = useTasks();
  const selectedDate = getDateForDay(selectedDay);
  const dateStr = formatDate(selectedDate);
  const { isChecked, markDone, markNotDone, undo, getStatus } = useCompletions(dateStr);

  const isToday = selectedDay === todayDay;
  const greeting = getGreeting();

  // Get tasks for selected date using recurrence logic
  const dateTasks = useMemo(() => {
    if (tasks.length === 0) return [];
    return getDbTasksForDate(selectedDate, tasks);
  }, [tasks, selectedDate]);

  const stats = useMemo(() => {
    return getDbDayStats(dateTasks, personFilter, isChecked);
  }, [dateTasks, personFilter, isChecked]);

  const progressPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const personName = personFilter === 'rubens' ? 'Rubens' : personFilter === 'diene' ? 'Diene' : '';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              {greeting}{personName ? `, ${personName}` : ''}
            </h1>
            <p className="text-[13px] text-muted mt-0.5">
              {DAY_LABELS[selectedDay]}{isToday ? ' \u00B7 Hoje' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!authDisabled && <UserMenu />}
          </div>
        </div>

        {/* Progress bar */}
        {activeTab === 'dia' && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-muted">
                {tasksLoading ? '...' : `${stats.done} de ${stats.total} essenciais`}
              </span>
              <span className="text-[11px] font-semibold text-accent tabular-nums">
                {tasksLoading ? '...' : `${progressPct}%`}
              </span>
            </div>
            <div className="h-1 bg-border-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}
      </header>

      {/* ── Day selector ──────────────────────────────────────── */}
      {activeTab === 'dia' && (
        <div className="px-5 py-2">
          <div className="flex gap-1">
            {DAYS.map((day) => {
              const isSelected = day === selectedDay;
              const isDayToday = day === todayDay;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition-all duration-200 tap-highlight ${
                    isSelected
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted hover:bg-surface'
                  }`}
                >
                  <span>{DAY_SHORT[day]}</span>
                  {isDayToday && (
                    <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-accent' : 'bg-accent'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Controls (Person + View toggle) ───────────────────── */}
      {activeTab === 'dia' && (
        <div className="px-5 py-2 flex items-center justify-between">
          {/* Person pills */}
          <div className="flex items-center gap-1">
            {(['rubens', 'diene', 'todos'] as PersonFilter[]).map((pf) => {
              const isActive = personFilter === pf;
              const label = pf === 'rubens' ? 'Rubens' : pf === 'diene' ? 'Diene' : 'Todos';
              return (
                <button
                  key={pf}
                  onClick={() => setPersonFilter(pf)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-200 tap-highlight ${
                    isActive
                      ? pf === 'rubens'
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'
                        : pf === 'diene'
                        ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300'
                        : 'bg-surface text-foreground border border-border'
                      : 'text-muted'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-surface border border-border rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('foco')}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                viewMode === 'foco'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted'
              }`}
              title="Modo Foco"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 12h6M12 9v6" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                viewMode === 'lista'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted'
              }`}
              title="Modo Lista"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────── */}
      <main className="px-5 pt-2 pb-4">
        {activeTab === 'dia' && tasksLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {activeTab === 'dia' && !tasksLoading && viewMode === 'foco' && (
          <FocusView
            tasks={dateTasks}
            isToday={isToday}
            person={personFilter}
            isChecked={isChecked}
            getStatus={getStatus}
            onMarkDone={markDone}
            onMarkNotDone={markNotDone}
          />
        )}
        {activeTab === 'dia' && !tasksLoading && viewMode === 'lista' && (
          <TimelineView
            tasks={dateTasks}
            isToday={isToday}
            person={personFilter}
            isChecked={isChecked}
            getStatus={getStatus}
            onMarkDone={markDone}
            onMarkNotDone={markNotDone}
            onUndo={undo}
          />
        )}
        {activeTab === 'emergencia' && <EmergencyView />}
        {activeTab === 'pendencias' && <BacklogView tasks={tasks} isLoading={tasksLoading} />}
      </main>

      {/* ── Bottom Navigation ─────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-lg border-t border-border safe-bottom z-50">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {([
            { id: 'dia' as Tab, label: 'Hoje', icon: (active: boolean) => (
              <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.5}>
                {active
                  ? <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                }
              </svg>
            )},
            { id: 'emergencia' as Tab, label: 'SOS', icon: (active: boolean) => (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )},
            { id: 'pendencias' as Tab, label: 'Backlog', icon: (active: boolean) => (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )},
          ]).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-2.5 px-4 tap-highlight transition-colors duration-200 ${
                  isActive ? 'text-accent' : 'text-muted'
                }`}
              >
                {tab.icon(isActive)}
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
