import { tasks } from './tasks';
import { contingencies } from './contingencies';
import { Task, Period, DayOfWeek, Person, Category } from './types';

// ── Period config ──────────────────────────────────────────────

export const PERIODS: { id: Period; label: string; time: string; icon: string }[] = [
  { id: 'MA', label: 'Manha', time: '06h — 12h', icon: '\u2600\uFE0F' },
  { id: 'TA', label: 'Tarde', time: '12h — 18h', icon: '\u{1F324}\uFE0F' },
  { id: 'NO', label: 'Noite', time: '18h — 21:30h', icon: '\u{1F319}' },
];

// ── Category config ────────────────────────────────────────────

export const categoryIcon: Record<Category, string> = {
  Cozinha: '\u{1F373}',
  Pedro: '\u{1F466}',
  Ester: '\u{1F476}',
  Casa: '\u{1F3E0}',
  Compras: '\u{1F6D2}',
  Pessoal: '\u{1F9D8}',
  Espiritual: '\u{1F54A}\uFE0F',
};

// ── Person styles ──────────────────────────────────────────────

export function getPersonStyle(person: Person) {
  const styles: Record<Person, { bg: string; label: string; initial: string; dot: string }> = {
    rubens: {
      bg: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
      label: 'Rubens',
      initial: 'R',
      dot: 'bg-sky-500',
    },
    diene: {
      bg: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
      label: 'Diene',
      initial: 'D',
      dot: 'bg-pink-500',
    },
    juntos: {
      bg: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
      label: 'Juntos',
      initial: 'J',
      dot: 'bg-violet-500',
    },
  };
  return styles[person];
}

// ── Day helpers ────────────────────────────────────────────────

export const DAYS: DayOfWeek[] = [
  'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo',
];

export const DAY_SHORT: Record<DayOfWeek, string> = {
  segunda: 'Seg', terca: 'Ter', quarta: 'Qua', quinta: 'Qui',
  sexta: 'Sex', sabado: 'Sab', domingo: 'Dom',
};

export const DAY_LABELS: Record<DayOfWeek, string> = {
  segunda: 'Segunda-feira', terca: 'Terca-feira', quarta: 'Quarta-feira',
  quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sabado', domingo: 'Domingo',
};

export function getTodayDayOfWeek(): DayOfWeek {
  const jsDay = new Date().getDay();
  const map: DayOfWeek[] = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  return map[jsDay];
}

// ── Time helpers ───────────────────────────────────────────────

export function getCurrentPeriod(): Period | null {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'MA';
  if (hour >= 12 && hour < 18) return 'TA';
  if (hour >= 18 && hour < 22) return 'NO';
  return null;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ── Task filtering ─────────────────────────────────────────────

export function getTasksForDay(day: DayOfWeek): Task[] {
  return tasks.filter((task) => {
    if (task.frequency === 'S') return false;
    if (task.frequency === 'T') return true;
    if (task.frequency === 'W' || task.frequency === 'Q') {
      return task.daysOfWeek?.includes(day) ?? false;
    }
    return false;
  });
}

export function getTasksForDayAndPeriod(day: DayOfWeek, period: Period): Task[] {
  return getTasksForDay(day).filter((task) => task.periods.includes(period));
}

export function filterByPerson(taskList: Task[], person: Person | 'todos'): Task[] {
  if (person === 'todos') return taskList;
  return taskList.filter((t) => t.primary === person || t.primary === 'juntos');
}

// ── Plan B ─────────────────────────────────────────────────────

export function getPlanB(task: Task): string {
  if (task.planB) return task.planB;
  const cat = contingencies.find((c) => c.category === task.category);
  return cat?.planB ?? 'Redistribua ou adie sem culpa.';
}

// ── Grouping ───────────────────────────────────────────────────

export function groupByCategory(taskList: Task[]): { category: Category; items: Task[] }[] {
  const map = new Map<Category, Task[]>();
  for (const t of taskList) {
    const list = map.get(t.category) ?? [];
    list.push(t);
    map.set(t.category, list);
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
}

// ── Stats ──────────────────────────────────────────────────────

export function getDayStats(day: DayOfWeek, person: Person | 'todos', isChecked: (id: string) => boolean) {
  const dayTasks = filterByPerson(getTasksForDay(day), person);
  const essential = dayTasks.filter((t) => !t.optional);
  const done = essential.filter((t) => isChecked(t.id)).length;
  return { total: essential.length, done, all: dayTasks.length };
}
