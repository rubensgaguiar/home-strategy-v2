import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  date,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── Enums ──────────────────────────────────────────────────────────

export const categoryEnum = pgEnum('category', [
  'cozinha', 'pedro', 'ester', 'casa', 'pessoal', 'espiritual', 'compras',
]);

export const personEnum = pgEnum('person', ['rubens', 'diene', 'juntos']);

export const recurrenceTypeEnum = pgEnum('recurrence_type', [
  'daily', 'weekly', 'monthly', 'yearly', 'none',
]);

export const periodEnum = pgEnum('period', ['MA', 'TA', 'NO']);

export const completionStatusEnum = pgEnum('completion_status', [
  'done', 'not_done',
]);

// ── Tables ─────────────────────────────────────────────────────────

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: categoryEnum('category').notNull(),
  primaryPerson: personEnum('primary_person').notNull(),
  secondaryPerson: personEnum('secondary_person'),
  repetitions: text('repetitions'),
  planB: text('plan_b'),
  optional: boolean('optional').default(false).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  protocolId: integer('protocol_id').references(() => protocols.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('tasks_category_idx').on(table.category),
  index('tasks_primary_person_idx').on(table.primaryPerson),
]);

export const taskRecurrences = pgTable('task_recurrences', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  type: recurrenceTypeEnum('type').notNull(),
  interval: integer('interval').default(1).notNull(),
  daysOfWeek: integer('days_of_week').array(),
  dayOfMonth: integer('day_of_month'),
  monthOfYear: integer('month_of_year'),
  weekOfMonth: integer('week_of_month'),
  periods: periodEnum('periods').array().notNull(),
}, (table) => [
  index('task_recurrences_task_id_idx').on(table.taskId),
]);

export const taskSteps = pgTable('task_steps', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
}, (table) => [
  index('task_steps_task_id_idx').on(table.taskId),
]);

export const protocols = pgTable('protocols', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  trigger: text('trigger').notNull(),
  actions: text('actions').array().notNull(),
  color: text('color').notNull(),
  icon: text('icon'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const taskCompletions = pgTable('task_completions', {
  id: serial('id').primaryKey(),
  taskId: integer('task_id').references(() => tasks.id, { onDelete: 'set null' }).notNull(),
  date: date('date').notNull(),
  status: completionStatusEnum('status').notNull(),
  userEmail: text('user_email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  unique('task_completions_task_date_unique').on(table.taskId, table.date),
  index('task_completions_task_date_idx').on(table.taskId, table.date),
  index('task_completions_date_email_idx').on(table.date, table.userEmail),
]);

export const categoryContingencies = pgTable('category_contingencies', {
  id: serial('id').primaryKey(),
  category: categoryEnum('category').notNull().unique(),
  planB: text('plan_b').notNull(),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userEmail: text('user_email').notNull(),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('push_subscriptions_email_idx').on(table.userEmail),
  unique('push_subscriptions_endpoint_unique').on(table.endpoint),
]);

export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userEmail: text('user_email').notNull().unique(),
  enabled: boolean('enabled').default(false).notNull(),
  periodStart: boolean('period_start').default(true).notNull(),
  periodEnd: boolean('period_end').default(true).notNull(),
  dailySummary: boolean('daily_summary').default(true).notNull(),
});

// ── Relations ──────────────────────────────────────────────────────

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  recurrence: one(taskRecurrences, {
    fields: [tasks.id],
    references: [taskRecurrences.taskId],
  }),
  steps: many(taskSteps),
  protocol: one(protocols, {
    fields: [tasks.protocolId],
    references: [protocols.id],
  }),
  completions: many(taskCompletions),
}));

export const taskRecurrencesRelations = relations(taskRecurrences, ({ one }) => ({
  task: one(tasks, {
    fields: [taskRecurrences.taskId],
    references: [tasks.id],
  }),
}));

export const taskStepsRelations = relations(taskSteps, ({ one }) => ({
  task: one(tasks, {
    fields: [taskSteps.taskId],
    references: [tasks.id],
  }),
}));

export const protocolsRelations = relations(protocols, ({ many }) => ({
  tasks: many(tasks),
}));

export const taskCompletionsRelations = relations(taskCompletions, ({ one }) => ({
  task: one(tasks, {
    fields: [taskCompletions.taskId],
    references: [tasks.id],
  }),
}));
