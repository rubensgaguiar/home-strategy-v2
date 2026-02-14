'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { DayOfWeek, Person, TaskComplete } from '@/lib/types';
import {
  DAYS, DAY_SHORT, DAY_LABELS, getTodayDayOfWeek, getGreeting,
  getDateForDay, formatDate, getDbTasksForDate, getDbDayStats,
} from '@/lib/helpers';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useCompletions } from '@/lib/hooks/use-completions';
import { UserMenu } from '@/components/user-menu';
import { FocusView } from '@/components/focus-view';
import { TimelineView } from '@/components/timeline-view';
import { WeekView } from '@/components/week-view';
import { MonthView } from '@/components/month-view';
import { EmergencyView } from '@/components/emergency-view';
import { BacklogView } from '@/components/backlog-view';
import { Fab } from '@/components/fab';
import { TaskCreateModal } from '@/components/task-create-modal';
import { TaskEditModal } from '@/components/task-edit-modal';
import { DashboardView } from '@/components/dashboard-view';

const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true';

type Tab = 'dia' | 'emergencia' | 'backlog' | 'dashboard';
type ViewMode = 'foco' | 'lista';
type TimeScope = 'hoje' | 'semana' | 'mes';
type PersonFilter = Person | 'todos';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday-based
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

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
  const [timeScope, setTimeScope] = useState<TimeScope>('hoje');

  // Week/month navigation offsets
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);

  const detectedPerson = useCurrentPerson();
  const [personFilter, setPersonFilter] = useState<PersonFilter>(detectedPerson ?? 'todos');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskComplete | null>(null);

  // API-backed data
  const { tasks, isLoading: tasksLoading, refetch } = useTasks();
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

  // Week navigation
  const currentWeekStart = useMemo(() => {
    const base = getWeekStart(new Date());
    const d = new Date(base);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekLabel = useMemo(() => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);
    const startDay = currentWeekStart.getDate();
    const endDay = end.getDate();
    const startMonth = currentWeekStart.getMonth();
    const endMonth = end.getMonth();
    if (startMonth === endMonth) {
      return `${startDay}–${endDay} ${MONTH_NAMES[startMonth]}`;
    }
    return `${startDay} ${MONTH_NAMES[startMonth].slice(0, 3)} – ${endDay} ${MONTH_NAMES[endMonth].slice(0, 3)}`;
  }, [currentWeekStart]);

  // Month navigation
  const currentMonth = useMemo(() => {
    const now = new Date();
    const totalMonths = now.getFullYear() * 12 + now.getMonth() + monthOffset;
    return { year: Math.floor(totalMonths / 12), month: totalMonths % 12 };
  }, [monthOffset]);

  const progressPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const personName = personFilter === 'rubens' ? 'Rubens' : personFilter === 'diene' ? 'Diene' : '';
  const inboxCount = useMemo(() => tasks.filter((t) => t.recurrence.type === 'none').length, [tasks]);

  const handleEditTask = useCallback((task: TaskComplete) => {
    setEditingTask(task);
  }, []);

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
              {timeScope === 'hoje' && `${DAY_LABELS[selectedDay]}${isToday ? ' · Hoje' : ''}`}
              {timeScope === 'semana' && (weekOffset === 0 ? 'Esta semana' : weekLabel)}
              {timeScope === 'mes' && `${MONTH_NAMES[currentMonth.month]} ${currentMonth.year}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!authDisabled && <UserMenu />}
          </div>
        </div>

        {/* Progress bar — only for day view */}
        {activeTab === 'dia' && timeScope === 'hoje' && (
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

      {/* ── Time scope switcher (Hoje / Semana / Mes) ─────────── */}
      {activeTab === 'dia' && (
        <div className="px-5 py-1.5">
          <div className="flex items-center bg-surface border border-border rounded-xl p-0.5">
            {(['hoje', 'semana', 'mes'] as TimeScope[]).map((scope) => {
              const isActive = timeScope === scope;
              const label = scope === 'hoje' ? 'Hoje' : scope === 'semana' ? 'Semana' : 'Mes';
              return (
                <button
                  key={scope}
                  onClick={() => {
                    setTimeScope(scope);
                    if (scope === 'semana') setWeekOffset(0);
                    if (scope === 'mes') setMonthOffset(0);
                  }}
                  className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 tap-highlight ${
                    isActive
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Day selector (only for 'hoje' scope) ──────────────── */}
      {activeTab === 'dia' && timeScope === 'hoje' && (
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

      {/* ── Week/Month navigation arrows ──────────────────────── */}
      {activeTab === 'dia' && timeScope === 'semana' && (
        <div className="px-5 py-2 flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface border border-border text-muted hover:text-foreground transition-colors tap-highlight"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-[13px] font-semibold text-foreground">{weekLabel}</span>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface border border-border text-muted hover:text-foreground transition-colors tap-highlight"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      )}

      {activeTab === 'dia' && timeScope === 'mes' && (
        <div className="px-5 py-2 flex items-center justify-between">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface border border-border text-muted hover:text-foreground transition-colors tap-highlight"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-[13px] font-semibold text-foreground">
            {MONTH_NAMES[currentMonth.month]} {currentMonth.year}
          </span>
          <button
            onClick={() => setMonthOffset((o) => o + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface border border-border text-muted hover:text-foreground transition-colors tap-highlight"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Person pills (dia + backlog) ──────────────────── */}
      {(activeTab === 'dia' || activeTab === 'backlog') && (
        <div className="px-5 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {(['rubens', 'diene', 'todos'] as PersonFilter[]).map((pf) => {
              const isActive = personFilter === pf;
              const label = pf === 'rubens' ? 'Rubens' : pf === 'diene' ? 'Diene' : 'Todos';
              return (
                <button
                  key={pf}
                  onClick={() => setPersonFilter(pf)}
                  className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all duration-200 tap-highlight ${
                    isActive
                      ? pf === 'rubens'
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'
                        : pf === 'diene'
                        ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300'
                        : 'bg-surface text-foreground border border-border'
                      : 'text-muted/80 bg-surface-hover border border-border-subtle'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* View toggle — only for dia + hoje */}
          {activeTab === 'dia' && timeScope === 'hoje' && (
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
          )}
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────── */}
      <main className="px-5 pt-2 pb-4">
        {activeTab === 'dia' && tasksLoading && (
          <div className="space-y-3">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
        )}

        {/* Day view — Focus mode */}
        {activeTab === 'dia' && !tasksLoading && timeScope === 'hoje' && viewMode === 'foco' && (
          <FocusView
            tasks={dateTasks}
            isToday={isToday}
            person={personFilter}
            isChecked={isChecked}
            getStatus={getStatus}
            onMarkDone={markDone}
            onMarkNotDone={markNotDone}
            onEditTask={handleEditTask}
          />
        )}

        {/* Day view — List mode */}
        {activeTab === 'dia' && !tasksLoading && timeScope === 'hoje' && viewMode === 'lista' && (
          <TimelineView
            tasks={dateTasks}
            isToday={isToday}
            person={personFilter}
            isChecked={isChecked}
            getStatus={getStatus}
            onMarkDone={markDone}
            onMarkNotDone={markNotDone}
            onUndo={undo}
            onEditTask={handleEditTask}
          />
        )}

        {/* Week view */}
        {activeTab === 'dia' && !tasksLoading && timeScope === 'semana' && (
          <WeekView
            tasks={tasks}
            weekStart={currentWeekStart}
            person={personFilter}
            onEditTask={handleEditTask}
          />
        )}

        {/* Month view */}
        {activeTab === 'dia' && !tasksLoading && timeScope === 'mes' && (
          <MonthView
            tasks={tasks}
            year={currentMonth.year}
            month={currentMonth.month}
            person={personFilter}
            onEditTask={handleEditTask}
          />
        )}

        {activeTab === 'emergencia' && <EmergencyView />}
        {activeTab === 'backlog' && <BacklogView tasks={tasks} isLoading={tasksLoading} person={personFilter} onEditTask={handleEditTask} />}
        {activeTab === 'dashboard' && <DashboardView />}
      </main>

      {/* ── FAB ─────────────────────────────────────────────── */}
      <Fab onClick={() => setShowCreateModal(true)} />

      {/* ── Modals ─────────────────────────────────────────── */}
      <TaskCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={refetch}
      />
      <TaskEditModal
        open={editingTask !== null}
        task={editingTask}
        onClose={() => setEditingTask(null)}
        onUpdated={refetch}
        onDeleted={refetch}
      />
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
            { id: 'backlog' as Tab, label: 'Backlog', icon: (active: boolean) => (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )},
            { id: 'dashboard' as Tab, label: 'Stats', icon: (active: boolean) => (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            )},
          ]).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 py-3 px-5 tap-highlight transition-colors duration-200 ${
                  isActive ? 'text-accent' : 'text-muted'
                }`}
              >
                <div className={`relative ${isActive ? 'p-1 -m-1 rounded-lg bg-accent/10' : ''}`}>
                  {tab.icon(isActive)}
                  {tab.id === 'backlog' && inboxCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5">
                      {inboxCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
