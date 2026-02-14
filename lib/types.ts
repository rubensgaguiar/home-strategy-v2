import { InferSelectModel } from 'drizzle-orm';
import {
  tasks,
  taskRecurrences,
  taskSteps,
  protocols,
  taskCompletions,
  categoryContingencies,
} from './db/schema';

// ── Database model types (inferred from Drizzle schema) ──────────

export type DbTask = InferSelectModel<typeof tasks>;
export type DbTaskRecurrence = InferSelectModel<typeof taskRecurrences>;
export type DbTaskStep = InferSelectModel<typeof taskSteps>;
export type DbProtocol = InferSelectModel<typeof protocols>;
export type DbTaskCompletion = InferSelectModel<typeof taskCompletions>;
export type DbCategoryContingency = InferSelectModel<typeof categoryContingencies>;

// ── Enum types ───────────────────────────────────────────────────

export type Period = 'MA' | 'TA' | 'NO';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';
export type CompletionStatus = 'done' | 'not_done';
export type Person = 'rubens' | 'diene' | 'juntos';
export type CategoryDb = 'cozinha' | 'pedro' | 'ester' | 'casa' | 'pessoal' | 'espiritual' | 'compras';

// Legacy types kept for backward compatibility during migration
export type DayOfWeek = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';
export type Frequency = 'T' | 'W' | 'Q' | 'S';
export type Category = 'Cozinha' | 'Pedro' | 'Ester' | 'Casa' | 'Pessoal' | 'Espiritual' | 'Compras';

// ── Composite types for API responses ────────────────────────────

export interface TaskWithRecurrence extends DbTask {
  recurrence: DbTaskRecurrence;
}

export interface TaskWithSteps extends DbTask {
  steps: DbTaskStep[];
}

export interface TaskComplete extends DbTask {
  recurrence: DbTaskRecurrence;
  steps: DbTaskStep[];
  protocol: DbProtocol | null;
}

// ── Legacy types (used by existing components until Phase 2 migration) ──

export interface Task {
  id: string;
  name: string;
  frequency: Frequency;
  periods: Period[];
  daysOfWeek?: DayOfWeek[];
  primary: Person;
  secondary?: Person | null;
  category: Category;
  repetitions?: string;
  planB?: string | null;
  optional?: boolean;
}

export interface CategoryContingency {
  category: Category;
  planB: string;
}

export interface Protocol {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  color: string;
}

// ── Category display name mapping ────────────────────────────────

export const categoryDisplayName: Record<CategoryDb, Category> = {
  cozinha: 'Cozinha',
  pedro: 'Pedro',
  ester: 'Ester',
  casa: 'Casa',
  pessoal: 'Pessoal',
  espiritual: 'Espiritual',
  compras: 'Compras',
};

export const categoryDbName: Record<Category, CategoryDb> = {
  Cozinha: 'cozinha',
  Pedro: 'pedro',
  Ester: 'ester',
  Casa: 'casa',
  Pessoal: 'pessoal',
  Espiritual: 'espiritual',
  Compras: 'compras',
};
