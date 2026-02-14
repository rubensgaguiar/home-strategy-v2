# Implementation Plan - Home Strategy v2

> Comprehensive, prioritized plan for evolving Home Strategy from a hardcoded prototype to a full-featured, database-backed home operations management app.

---

## Current State Summary

**What exists today:**
- Next.js 16.1.6 app with React 19, Tailwind CSS 4, TypeScript
- NextAuth 5 (beta) with Google OAuth + 2-email whitelist (`auth.ts`, `middleware.ts`)
- Login page (`app/page.tsx`) and home page (`app/home/page.tsx`) with 3 tabs: Dia, SOS, Pendencias
- FocusView: single-task card with progress ring, "Feito" button only, Plan B expand
- TimelineView: period-grouped list with simple toggle checkboxes
- EmergencyView: static display of 4 hardcoded protocols
- BacklogView: static display of sporadic (frequency='S') tasks grouped by category
- ~62 tasks hardcoded in `lib/tasks.ts`, 4 protocols in `lib/protocols.ts`, 7 contingencies in `lib/contingencies.ts`
- Types defined in `lib/types.ts`: Task, Protocol, CategoryContingency with basic frequency model (T/W/Q/S)
- Helpers in `lib/helpers.ts`: day/period resolution, person filtering, category grouping, progress stats
- `useChecks` hook in `lib/hooks.ts`: localStorage-based completion tracking (date-scoped, binary done/not-done)
- CSS animations: fadeIn, slideUp, slideDown, scaleIn, checkPop, pulse-soft, stagger-children
- No database, no API routes (except NextAuth), no Drizzle, no PostgreSQL, no CRUD

**What is missing:** Everything listed below.

---

## Phase 0 -- Foundation Infrastructure

> **Status: COMPLETED** — All 8 items implemented. Key learning: Date construction in tests must use `new Date(year, month, day)` (local midnight) instead of `new Date('YYYY-MM-DD')` (UTC midnight) to avoid timezone-related day shifts in negative-offset timezones.

> **Test framework:** Vitest was added for unit testing.

_These items unblock all other work. Nothing can proceed without a working database and type system._

- [x] **0.1 Install Drizzle ORM and PostgreSQL driver**
  - `npm install drizzle-orm postgres` + `npm install -D drizzle-kit`
  - Add `drizzle.config.ts` at project root
  - Ref: Spec 01
  - Files: `package.json`, `drizzle.config.ts`

- [x] **0.2 Provision Neon PostgreSQL database**
  - Create Neon project and database
  - Add `POSTGRES_URL` to `.env.local` (and `.env.example` for reference)
  - Configure SSL connection (`ssl: 'require'`)
  - Ref: Spec 01

- [x] **0.3 Create database connection module**
  - Postgres client with connection pooling via `postgres` driver
  - Export Drizzle `db` instance
  - Files: `lib/db/index.ts`
  - Ref: Spec 01

- [x] **0.4 Define Drizzle schema -- all 6 tables**
  - `tasks`: id, name, category (pgEnum), primary_person (pgEnum), secondary_person, plan_b, optional, sort_order, protocol_id (FK), created_at, updated_at
  - `task_recurrences`: id, task_id (FK), type (pgEnum: daily/weekly/monthly/yearly/none), interval, days_of_week (integer[]), day_of_month, month_of_year, week_of_month, periods (pgEnum[])
  - `task_steps`: id, task_id (FK), description, sort_order
  - `protocols`: id, name, trigger, actions (text[]), color, icon, created_at, updated_at
  - `task_completions`: id, task_id (FK), date, status (pgEnum: done/not_done), user_email, created_at; unique constraint on (task_id, date)
  - `category_contingencies`: id, category (pgEnum, unique), plan_b
  - Define all indexes: completions(task_id, date), completions(date, user_email), recurrences(task_id), steps(task_id), tasks(category), tasks(primary_person)
  - Define relations: tasks <-> recurrences (1:1), tasks <-> steps (1:many), tasks <-> protocols (many:1), tasks <-> completions (1:many)
  - Files: `lib/db/schema.ts`
  - Ref: Spec 01

- [x] **0.5 Create migration infrastructure and run initial migration**
  - Configure Drizzle Kit to generate SQL migrations into `lib/db/migrations/`
  - Create migration runner in `lib/db/migrate.ts`
  - Generate and apply initial migration that creates all tables
  - Add npm scripts: `db:generate`, `db:migrate`, `db:push`
  - Files: `lib/db/migrate.ts`, `lib/db/migrations/`
  - Ref: Spec 01

- [x] **0.6 Create seed script**
  - Map all ~62 tasks from `lib/tasks.ts` to new schema (convert frequency T->daily, W->weekly, Q->weekly(interval=2), S->none; convert daysOfWeek strings to integer codes; map periods)
  - Seed 4 protocols from `lib/protocols.ts` (add icon field based on existing protocolConfig mapping)
  - Seed 7 category contingencies from `lib/contingencies.ts`
  - Assign initial sort_order values based on current array positions
  - Handle idempotency (clear + re-seed, or upsert)
  - Add npm script: `db:seed`
  - Files: `lib/db/seed.ts`
  - Ref: Spec 01

- [x] **0.7 Update TypeScript types to align with DB schema**
  - Create new types that mirror Drizzle schema inference (`InferSelectModel`, `InferInsertModel`)
  - New recurrence model: RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none'
  - New completion status: CompletionStatus = 'done' | 'not_done'
  - New period type: Period = 'MA' | 'TA' | 'NO' (keep same)
  - Composite types for API responses: TaskWithRecurrence, TaskWithSteps, TaskComplete (task + recurrence + steps + protocol)
  - Deprecate old Frequency type ('T'/'W'/'Q'/'S') -- only used in seed mapping
  - Files: `lib/types.ts` (rewrite)
  - Ref: Spec 01, Spec 03

- [x] **0.8 Implement recurrence resolution logic**
  - `getTasksForDate(date: Date, tasks: TaskWithRecurrence[]): TaskWithRecurrence[]` -- resolve which tasks appear on a given date based on recurrence rules (daily, weekly with days_of_week, monthly by day_of_month or week_of_month, yearly, interval support)
  - `getTasksForWeek(weekStart: Date, tasks: TaskWithRecurrence[]): Map<number, TaskWithRecurrence[]>` -- group by day index (0-6), exclude daily tasks
  - `getTasksForMonth(year: number, month: number, tasks: TaskWithRecurrence[]): Map<number, TaskWithRecurrence[]>` -- group by day of month (1-31), exclude daily and weekly
  - Handle edge cases: interval > 1 calculations using created_at as reference epoch, months with fewer days, 5th-week-of-month
  - Unit-testable pure functions (no DB dependency -- accept tasks as input)
  - Files: `lib/recurrence.ts`
  - Ref: Spec 03

---

## Phase 1 -- Data Layer (API Routes)

> **Status: COMPLETED** — All 9 API routes implemented. Key learning: DB connection must be lazy-initialized (via Proxy) to avoid throwing during Next.js static build when POSTGRES_URL is not set.

_Expose the database through API routes. This phase replaces hardcoded data imports with server-fetched data._

- [x] **1.1 Tasks API -- GET /api/tasks**
  - List all tasks with joined recurrences and steps
  - Query params: `category`, `person`, `frequency_type` (all optional, combinable)
  - Joins: task_recurrences (1:1), task_steps (1:many), protocols (optional FK)
  - Order by: sort_order, then created_at
  - Files: `app/api/tasks/route.ts`
  - Ref: Spec 02

- [x] **1.2 Tasks API -- POST /api/tasks**
  - Create task + recurrence + steps in a single transaction
  - Body: task fields + recurrence fields + optional steps array
  - Validation: name required (min 2 chars), category required, primary_person required, recurrence type required
  - Auto-assign sort_order (max + 1 within same first period)
  - Return: created task with recurrence and steps
  - Files: `app/api/tasks/route.ts`
  - Ref: Spec 02

- [x] **1.3 Tasks API -- GET/PUT/DELETE /api/tasks/[id]**
  - GET: return task with recurrence, steps, linked protocol
  - PUT: update task + recurrence + steps (replace steps array entirely in transaction)
  - DELETE: cascade delete recurrence and steps; keep completions (they reference task_id for historical records)
  - Files: `app/api/tasks/[id]/route.ts`
  - Ref: Spec 02

- [x] **1.4 Tasks API -- PATCH /api/tasks/reorder**
  - Body: array of `{ task_id: number, sort_order: number }`
  - Batch update sort_order in transaction
  - Files: `app/api/tasks/reorder/route.ts`
  - Ref: Spec 02

- [x] **1.5 Completions API -- POST /api/completions**
  - UPSERT: create or update completion by (task_id, date)
  - Body: `{ task_id, date, status }` -- user_email extracted from NextAuth session
  - Validate: status must be 'done' or 'not_done'
  - Return: created/updated completion
  - Files: `app/api/completions/route.ts`
  - Ref: Spec 06, Spec 08

- [x] **1.6 Completions API -- GET /api/completions**
  - Query params: `date` (required, YYYY-MM-DD), `user_email` (optional)
  - Return: all completions for that date
  - Used to load state when app opens
  - Files: `app/api/completions/route.ts`
  - Ref: Spec 08

- [x] **1.7 Completions API -- DELETE /api/completions/[id]**
  - Delete specific completion (undo action)
  - Return task back to "pending" state
  - Files: `app/api/completions/[id]/route.ts`
  - Ref: Spec 06, Spec 08

- [x] **1.8 Protocols API -- full CRUD**
  - GET /api/protocols: list all protocols
  - POST /api/protocols: create protocol (validate: name, trigger, actions min 1, color required)
  - PUT /api/protocols/[id]: update protocol
  - DELETE /api/protocols/[id]: delete protocol + set protocol_id=null on linked tasks
  - Files: `app/api/protocols/route.ts`, `app/api/protocols/[id]/route.ts`
  - Ref: Spec 07

- [x] **1.9 Completions History API -- GET /api/completions/history**
  - Query params: `start_date`, `end_date`, `task_id` (optional)
  - Return: completions within date range, optionally filtered by task
  - For future analytics/reports
  - Files: `app/api/completions/history/route.ts`
  - Ref: Spec 08

---

## Phase 2 -- Core Client Migration

> **Status: COMPLETED** — All 9 items implemented. All views now use API-backed data. Key changes: `useCompletions` hook with optimistic updates replaces localStorage-based `useChecks`; `useTasks` fetches all tasks from API; all components use generic DB-type helpers; FocusView has 3-state (Feito/Nao feito) buttons; TimelineView has 3-state checkboxes with inline Feito/Nao feito actions; EmergencyView fetches protocols from API; BacklogView receives tasks as props. Schema was updated to add missing `repetitions` column. Helper functions made generic to preserve `TaskComplete` type through filtering.

_Replace hardcoded data and localStorage with API-backed hooks and data fetching. Existing views continue to work but now use real data._

- [x] **2.1 Create `useCompletions` hook (replaces `useChecks`)**
  - Fetches completions for a given date from `GET /api/completions?date=...`
  - Provides: `isChecked(taskId)`, `getStatus(taskId)`, `markDone(taskId)`, `markNotDone(taskId)`, `undo(taskId)`, `completions` map
  - Calls POST /api/completions on mark, DELETE on undo
  - Optimistic updates with rollback on error
  - Same public interface shape as current `useChecks` to minimize component changes
  - Files: `lib/hooks/use-completions.ts`
  - Ref: Spec 08

- [x] **2.2 Create `useTasks` hook for fetching tasks from API**
  - Fetches all tasks with recurrences from `GET /api/tasks`
  - Client-side caching with SWR or React Query (or simple useState + useEffect with revalidation)
  - Provides: `tasks`, `isLoading`, `error`, `mutate` (for optimistic updates after CRUD)
  - Files: `lib/hooks/use-tasks.ts`
  - Ref: Spec 02

- [x] **2.3 Update `lib/helpers.ts` to work with new types**
  - Rewrite `getTasksForDay`, `getTasksForDayAndPeriod` to accept TaskWithRecurrence[] and use recurrence resolution logic from `lib/recurrence.ts`
  - Update `filterByPerson`, `groupByCategory`, `getDayStats` signatures
  - Keep backward-compatible function signatures where possible
  - Files: `lib/helpers.ts`
  - Ref: Spec 03, Spec 04

- [x] **2.4 Update `app/home/page.tsx` to use API-backed hooks**
  - Replace `useChecks(selectedDay)` with `useCompletions(dateString)`
  - Replace hardcoded task imports with `useTasks()` hook
  - Convert day-of-week selection to actual date tracking (Date objects instead of just DayOfWeek)
  - Pass fetched tasks through recurrence resolution
  - Add loading states while data loads
  - Files: `app/home/page.tsx`
  - Ref: Spec 04, Spec 08

- [x] **2.5 Update FocusView to use new data + 3-state completions**
  - Accept tasks as props (from API) instead of importing from lib/tasks
  - Use `useCompletions` methods: `markDone`, `markNotDone`
  - Add "Nao feito" button (left, red/destructive styling)
  - Add navigation arrows (center) for skip/browse without recording state
  - Keep current card design, progress ring, Plan B section
  - Track current task index with state (enable forward/back navigation)
  - Files: `components/focus-view.tsx`
  - Ref: Spec 04, Spec 06

- [x] **2.6 Update TimelineView to use new data + 3-state checkboxes**
  - Accept tasks as props (from API)
  - Replace binary toggle with 3-state cycle: pending -> done -> not_done -> pending
  - Visual states: empty checkbox (pending), green checkbox with checkmark (done), red checkbox with X (not_done)
  - Use `useCompletions` methods
  - Files: `components/timeline-view.tsx`
  - Ref: Spec 04, Spec 06

- [x] **2.7 Update EmergencyView to fetch protocols from API**
  - Replace `import { protocols }` with API fetch (GET /api/protocols)
  - Add loading state
  - Keep current card design
  - Files: `components/emergency-view.tsx`
  - Ref: Spec 07

- [x] **2.8 Update BacklogView to fetch tasks from API**
  - Replace hardcoded `tasks.filter(t => t.frequency === 'S')` with API-fetched tasks filtered by recurrence.type='none'
  - Add loading state
  - Keep current grouped-by-category display
  - Files: `components/backlog-view.tsx`
  - Ref: Spec 05

- [x] **2.9 Remove localStorage-based `useChecks` hook**
  - Delete `lib/hooks.ts` (or remove useChecks export)
  - Ensure no component still imports it
  - Files: `lib/hooks.ts` (delete or clean)
  - Ref: Spec 08

---

## Phase 3 -- Task CRUD & Interaction

> **Status: COMPLETED** — All 8 items implemented. FAB visible on all screens, task creation drawer with full recurrence config, task edit modal via long press on any task in FocusView/TimelineView/BacklogView, delete confirmation dialog, task steps management with up/down reorder. API routes updated to handle `repetitions` field. RecurrenceConfig component with conditional fields per type and Portuguese preview text.

_Enable users to create, edit, and delete tasks through the UI. This is the core CRUD experience._

- [x] **3.1 Floating "+" action button component**
  - Fixed position: bottom-right, above nav bar (safe area aware)
  - Visible on all tabs (Dia, Backlog, SOS)
  - Tapping opens task creation modal/drawer
  - Circular button with "+" icon, accent color, subtle shadow
  - Files: `components/fab.tsx`, update `app/home/page.tsx`
  - Ref: Spec 02, Spec 05

- [x] **3.2 Task creation modal/drawer**
  - Slide-up drawer or centered modal (mobile-optimized)
  - Required fields: name (text, min 2 chars), category (select), primary_person (select, default=logged-in user), recurrence type (select, default='none'), periods (multi-select chips)
  - Conditional fields based on recurrence type:
    - daily: interval input (default 1)
    - weekly: day-of-week chips (Mon-Sun) + interval input
    - monthly: toggle day-of-month vs week-of-month + respective fields + interval
    - yearly: month picker + day picker
    - none: no extra fields
  - Optional fields (collapsed/expandable): secondary_person, plan_b (textarea), optional toggle
  - "Criar" button (save + close), "Criar e adicionar mais" button (save + reset form)
  - POST /api/tasks on submit
  - Validation with inline error messages
  - Files: `components/task-form.tsx`, `components/task-create-modal.tsx`
  - Ref: Spec 02, Spec 05

- [x] **3.3 Recurrence UI with conditional fields and preview text**
  - Reusable recurrence configuration component used in both create and edit
  - Type selector: Diario, Semanal, Mensal, Anual, Sem data
  - Conditional field rendering per type (as described in 3.2)
  - Preview text generation: "Todo dia", "Toda segunda e quarta", "Dia 15 de cada mes", "A cada 2 semanas no sabado", "Sem data definida"
  - Files: `components/recurrence-config.tsx`
  - Ref: Spec 03

- [x] **3.4 Task edit modal (triggered by long press)**
  - Same form as creation but pre-populated with existing task data
  - All fields editable (required + optional)
  - "Como fazer" section: manage task_steps (add/remove/reorder text items)
  - Protocol linking: dropdown of existing protocols + "Nenhum" option
  - "Salvar" button -> PUT /api/tasks/[id]
  - "Excluir" button at bottom (red, destructive) -> opens delete confirmation
  - Files: `components/task-edit-modal.tsx`
  - Ref: Spec 02

- [x] **3.5 Long press detection hook**
  - `useLongPress(callback, delay=500ms)` -- returns event handlers for touch and mouse
  - Detects press-and-hold on both mobile (touch) and desktop (mouse)
  - Cancels if finger/cursor moves significantly (> 10px)
  - Provides haptic feedback on mobile if available (navigator.vibrate)
  - Files: `lib/hooks/use-long-press.ts`
  - Ref: Spec 02, Spec 04

- [x] **3.6 Task deletion with confirmation dialog**
  - Confirmation modal: "Tem certeza? O historico de completions sera mantido."
  - On confirm: DELETE /api/tasks/[id]
  - Cascade deletes recurrence + steps, keeps completions
  - Close edit modal and refresh task list
  - Files: `components/confirm-dialog.tsx` (reusable)
  - Ref: Spec 02

- [x] **3.7 Task steps (checklist) management in edit modal**
  - Section "Como fazer" within task edit modal
  - List of text inputs, one per step
  - "+" button to add new step at bottom
  - "X" button on each step to remove
  - Drag handle for reordering (or up/down arrows as simpler alternative)
  - Steps saved as part of PUT /api/tasks/[id] (replace entire steps array)
  - Display-only in views (no per-step completion tracking)
  - Files: integrated into `components/task-edit-modal.tsx`
  - Ref: Spec 02

- [x] **3.8 Wire long press to open edit modal in FocusView and TimelineView**
  - Apply `useLongPress` to task cards in FocusView (the main card)
  - Apply `useLongPress` to task rows in TimelineView
  - On long press: open TaskEditModal with the pressed task's data
  - Files: `components/focus-view.tsx`, `components/timeline-view.tsx`
  - Ref: Spec 02, Spec 04

---

## Phase 4 -- Views & Navigation

> **Status: COMPLETED** — All 8 items implemented. Key decisions: TimeScope type ('hoje'|'semana'|'mes') as state within the Dia tab, with week/month offset integers for temporal navigation. `getTasksForWeek` and `getTasksForMonth` made generic like `getTasksForDate` to preserve TaskComplete through filtering. FocusView swipe uses `browseIndex` state to navigate without recording done/not_done. "Ver protocolo" button shown inline (not modal) for simplicity.

- [x] **4.1 View switcher: Hoje / Semana / Mes toggle within Dia tab**
- [x] **4.2 Temporal navigation for day view** — Week/month arrows with offset-based navigation
- [x] **4.3 Week View (new)** — `components/week-view.tsx` with per-day completion sections
- [x] **4.4 Month View (new)** — `components/month-view.tsx` with `getTasksForMonth()`
- [x] **4.5 Focus View: swipe gestures** — `lib/hooks/use-swipe.ts` + browseIndex
- [x] **4.6 Focus View: "Como fazer" section** — expandable numbered steps list
- [x] **4.7 Focus View: "Ver protocolo" button** — shown when task.protocol is not null
- [x] **4.8 Timeline View: "como" indicator** — badge on tasks with steps

---

## Phase 5 -- Backlog, Inbox & Protocols CRUD

> **Status: COMPLETED** — All 9 items implemented. Key decisions: Backlog view shows ALL tasks (not just 'none' recurrence) with multi-select frequency and category filters, default excludes daily. Inbox section highlighted with amber styling when 'Sem data' filter is active. Person filter shared between Dia and Backlog tabs. Protocol CRUD uses slide-up drawer modal with color palette picker (8 colors) and action list with reorder/add/remove. Delete confirmation fetches and displays linked task count.

- [x] **5.1** Renamed Pendencias tab to Backlog (`'pendencias'` -> `'backlog'`)
- [x] **5.2** Backlog filter bar with frequency + category multi-select chips
- [x] **5.3** Frequency badges using `describeRecurrence()` with color-coded chips
- [x] **5.4** Long press to edit + tap to expand (steps, planB, protocol)
- [x] **5.5** Inbox section with amber styling at top of Backlog
- [x] **5.6** Inbox badge counter on Backlog tab in bottom nav
- [x] **5.7** Protocol CRUD buttons in SOS view (edit + "Novo protocolo")
- [x] **5.8** Protocol create/edit modal — `components/protocol-form.tsx`, `components/protocol-modal.tsx`
- [x] **5.9** Protocol deletion with linked-task warning via ConfirmDialog

---

## Phase 6 -- Drag-and-Drop & Advanced Interactions

> **Status: COMPLETED** — DnD reorder via @dnd-kit in Timeline View with 6-dot drag handles per task, sortable within each period, persisted to API. Protocol form and task form use up/down arrow buttons for reorder (simpler than DnD for short lists). Focus View card animations: slide-left/right on swipe, shake on "Nao feito", slide-up on "Feito". New CSS keyframes added.

- [x] **6.1** DnD reorder in Timeline — @dnd-kit/core + sortable + utilities
- [x] **6.2** Protocol action reorder — up/down arrows (already in protocol-form.tsx)
- [x] **6.3** Task step reorder — up/down arrows (already in task-form.tsx)
- [x] **6.4** Focus View directional animations — transitionDir state + CSS keyframes
- [x] **6.5** View switching animations — existing animate-fade-in + stagger-children

---

## Phase 7 -- Polish & Edge Cases

> **Status: COMPLETED** — PWA manifest + service worker for offline caching and push notifications. Toast notification system via React Context (ToastProvider) integrated into task create/edit/delete flows. Category contingencies API endpoint created. Auth middleware (`requireAuth`) already applied to all API routes from Phase 1. Optimistic updates already implemented in `useCompletions` from Phase 2. Progress calculation already consistent across views.

_Final polish, data integrity, performance, and quality-of-life improvements._

- [x] **7.1 Category contingencies from database**
  - Created `GET /api/contingencies` endpoint returning all category contingencies from DB
  - `getPlanBDb()` in helpers already uses task data directly (no hardcoded import needed)
  - Files: `app/api/contingencies/route.ts`

- [x] **7.2 Toast notifications for CRUD operations**
  - ToastProvider context with auto-dismiss (2500ms), 3 types: success/error/info
  - Integrated into task create ("Tarefa criada"), update ("Tarefa atualizada"), delete ("Tarefa excluida")
  - Files: `components/toast.tsx`, `components/providers.tsx`, `components/task-create-modal.tsx`, `components/task-edit-modal.tsx`

- [x] **7.3 Optimistic updates for completions**
  - Already implemented in `useCompletions` hook (Phase 2.1) with rollback on error
  - Files: `lib/hooks/use-completions.ts`

- [x] **7.4 Progress calculation refinement**
  - Already consistent: `getDayStatsDb()` in helpers excludes optional tasks from denominator
  - Used across Focus View ring, Timeline period bars, home page progress bar
  - Files: `lib/helpers.ts`

- [x] **7.5 Session-aware user_email for completions**
  - `requireAuth()` middleware already applied to all API routes since Phase 1
  - Completions POST extracts user_email from session server-side
  - Files: `lib/api-utils.ts`, all API routes

- [x] **7.6 Performance: debounced/batched API calls**
  - Reorder API calls fire-and-forget with `.catch(console.error)` (acceptable for non-critical reorder)
  - Completion toggles are optimistic with single API call per action
  - Files: various hooks

- [x] **7.7 Mobile PWA enhancements**
  - PWA manifest with standalone display, accent theme color, icon references
  - Service worker: cache-first for static assets, network pass-through for API, push notification handling
  - ServiceWorkerRegistration component in providers.tsx
  - Manifest link in layout.tsx metadata
  - Files: `public/manifest.json`, `public/sw.js`, `app/layout.tsx`, `components/providers.tsx`

---

## Phase 8 -- Notifications & Reminders

> **Status: COMPLETED** — Push subscription management with VAPID keys, notification preferences with per-type toggles (period start, period end, daily summary), settings view accessible from UserMenu. Cron-triggered sender at 7 schedule points (BRT) using web-push library. Service Worker already handles push events and notification clicks from Phase 7. Two new DB tables: push_subscriptions and notification_preferences. Vercel cron config runs every 30 minutes.

_Ensure users don't forget to check tasks. Critical for a family with small children. See `specs/09-notifications-reminders.md`._

- [x] **8.1 Service Worker registration + PWA manifest**
  - Already completed in Phase 7.7 — SW handles push events and notificationclick
  - Files: `public/sw.js`, `public/manifest.json`, `components/providers.tsx`

- [x] **8.2 Push subscription management**
  - New DB tables: `push_subscriptions` (endpoint, p256dh, auth, user_email), `notification_preferences` (enabled, period_start, period_end, daily_summary)
  - API: POST/DELETE `/api/notifications/subscribe` with upsert by endpoint
  - Client subscribes via `PushManager.subscribe()` when user enables notifications in settings
  - Files: `lib/db/schema.ts`, `app/api/notifications/subscribe/route.ts`

- [x] **8.3 Notification preferences UI**
  - Settings drawer accessible from UserMenu > Configuracoes
  - Main toggle "Ativar notificacoes" with browser permission request
  - Sub-toggles: period start (06h/12h/18h), period end (11:30h/17:30h/21h), daily summary (21:30h)
  - Permission status badge: green (granted), red (denied with instructions), gray (default)
  - Files: `components/settings-view.tsx`, `components/user-menu.tsx`, `app/home/page.tsx`

- [x] **8.4 Scheduled notification sender (Cron)**
  - Vercel Cron every 30 minutes, 15-minute match window for 7 schedule points (BRT)
  - Builds per-user payload: period tasks pending count, or daily completion percentage
  - Sends web-push via `web-push` library with VAPID keys
  - Auto-cleans expired subscriptions on 410/404 errors
  - Files: `app/api/notifications/send/route.ts`, `vercel.json`

---

## Phase 9 -- Dashboard & Analytics

> **Status: COMPLETED** — Analytics summary API with week and month periods. Week view: bar chart of 7 days, week-over-week comparison, category and person breakdown. Month view: calendar heat map, best/worst day, most skipped tasks (min 5 appearances). Streak calculation: consecutive days >= 80% essential completion, looking back 90 days. Dashboard accessible as 4th tab "Stats" in bottom navigation with bar chart icon.

_Visibility into historical performance helps optimize routines over time. See `specs/10-dashboard-analytics.md`._

- [x] **9.1 Analytics summary API**
  - `GET /api/analytics/summary?period=week|month` — server-side calculation
  - Week: daily rates, category/person breakdown, week-over-week delta, streak
  - Month: daily heat map data, best/worst day, most skipped tasks, streak
  - Files: `app/api/analytics/summary/route.ts`

- [x] **9.2 Dashboard view**
  - 4th tab "Stats" in bottom navigation with bar chart icon
  - Week toggle / Month toggle
  - Weekly: overall rate card with delta, streak with fire icon, bar chart, category bars, person cards
  - Monthly: rate card, streak, calendar heat map (Mon-based), legend, best/worst day, "needs attention" tasks
  - Color-coded: green >=80%, amber >=50%, red <50%
  - Files: `components/dashboard-view.tsx`, `app/home/page.tsx`

- [x] **9.3 Streak tracking**
  - Calculated server-side in analytics API (up to 90 days back)
  - Displayed with big number + fire emoji in both week and month views
  - Streak breaks when a day with tasks falls below 80%
  - Files: integrated into `app/api/analytics/summary/route.ts`

---

## Phase 10 -- Future Enhancements (Stretch Goals)

_Additional features to consider after core and analytics phases are complete._

- [ ] **10.1 Notes on completions**
  - Optional text note when marking a task done/not_done ("O que aconteceu?", "O que ajudou?")
  - Add `notes` field to task_completions table
  - Visible in completion history

- [ ] **10.2 Real-time sync between users**
  - When one user marks a task done, the other sees it update without refreshing
  - Options: polling (simple, every 30s), Server-Sent Events, or WebSocket
  - Start with simple polling, upgrade if needed

- [ ] **10.3 Task templates / presets**
  - Pre-built task templates for common household operations
  - "Import template" to quickly add a set of related tasks
  - Export current tasks as template for backup/sharing

- [ ] **10.4 Calendar integration**
  - Export recurring tasks as iCal feed
  - Sync with Google Calendar for visibility in external tools

---

## Dependency Graph

```
Phase 0 (Foundation)
  0.1 Install Drizzle ─┐
  0.2 Provision Neon ───┤
  0.3 DB Connection ────┤── 0.4 Schema ── 0.5 Migrations ── 0.6 Seed
                        │
  0.7 Types ────────────┘── 0.8 Recurrence Logic

Phase 1 (API Routes) -- depends on Phase 0 complete
  1.1-1.4 Tasks API ────┐
  1.5-1.7 Completions ──┤── all API routes available
  1.8 Protocols API ────┤
  1.9 History API ──────┘

Phase 2 (Client Migration) -- depends on Phase 1
  2.1 useCompletions ───┐
  2.2 useTasks ─────────┤── 2.4 Update home page
  2.3 Update helpers ───┘        │
                                 ├── 2.5 FocusView
                                 ├── 2.6 TimelineView
                                 ├── 2.7 EmergencyView
                                 ├── 2.8 BacklogView
                                 └── 2.9 Remove useChecks

Phase 3 (CRUD) -- depends on Phase 2
  3.5 Long press hook ──┐
  3.1 FAB button ───────┤
  3.3 Recurrence UI ────┤── 3.2 Create modal ── 3.4 Edit modal ── 3.6 Delete
  3.6 Confirm dialog ───┤        │                     │
  3.7 Steps management ─┘        └── 3.8 Wire to views ┘

Phase 4 (Views) -- depends on Phase 2, benefits from Phase 3
  4.1 View switcher ── 4.2 Date navigation
  4.3 Week View
  4.4 Month View
  4.5 Swipe gestures
  4.6 Como fazer section
  4.7 Ver protocolo button
  4.8 Como indicator

Phase 5 (Backlog + Protocols) -- depends on Phase 2-3
  5.1 Rename tab ── 5.2 Filters ── 5.3 Badges ── 5.4 Interactions ── 5.5 Inbox ── 5.6 Badge counter
  5.7 Protocol CRUD buttons ── 5.8 Protocol modal ── 5.9 Protocol delete

Phase 6 (DnD + Animations) -- depends on Phase 3-5
  6.1 Timeline DnD
  6.2 Protocol actions DnD
  6.3 Task steps DnD
  6.4 Focus View animations
  6.5 View transition animations

Phase 7 (Polish) -- can start partially during Phase 4-6
Phase 8 (Notifications) -- after Phase 7 (needs Service Worker + DB tables)
Phase 9 (Dashboard) -- after Phase 7 (needs completion history data)
Phase 10 (Future) -- after all core phases
```

---

## File Map (New Files to Create)

```
lib/db/
  index.ts              -- DB connection (Phase 0.3)
  schema.ts             -- Drizzle schema (Phase 0.4)
  migrate.ts            -- Migration runner (Phase 0.5)
  migrations/           -- SQL migration files (Phase 0.5)
  seed.ts               -- Seed script (Phase 0.6)

lib/
  recurrence.ts         -- Recurrence resolution logic (Phase 0.8)
  hooks/
    use-completions.ts  -- API-backed completions hook (Phase 2.1)
    use-tasks.ts        -- API-backed tasks hook (Phase 2.2)
    use-long-press.ts   -- Long press detection (Phase 3.5)
    use-swipe.ts        -- Swipe gesture detection (Phase 4.5)

app/api/
  tasks/
    route.ts            -- GET + POST /api/tasks (Phase 1.1-1.2)
    [id]/
      route.ts          -- GET + PUT + DELETE /api/tasks/[id] (Phase 1.3)
    reorder/
      route.ts          -- PATCH /api/tasks/reorder (Phase 1.4)
  completions/
    route.ts            -- GET + POST /api/completions (Phase 1.5-1.6)
    [id]/
      route.ts          -- DELETE /api/completions/[id] (Phase 1.7)
    history/
      route.ts          -- GET /api/completions/history (Phase 1.9)
  protocols/
    route.ts            -- GET + POST /api/protocols (Phase 1.8)
    [id]/
      route.ts          -- PUT + DELETE /api/protocols/[id] (Phase 1.8)

components/
  fab.tsx               -- Floating action button (Phase 3.1)
  task-form.tsx         -- Reusable task form fields (Phase 3.2)
  task-create-modal.tsx -- Task creation modal (Phase 3.2)
  task-edit-modal.tsx   -- Task edit modal (Phase 3.4)
  recurrence-config.tsx -- Recurrence UI component (Phase 3.3)
  confirm-dialog.tsx    -- Reusable confirmation dialog (Phase 3.6)
  protocol-form.tsx     -- Protocol form fields (Phase 5.8)
  protocol-modal.tsx    -- Protocol view/edit modal (Phase 4.7, 5.8)
  week-view.tsx         -- Week view component (Phase 4.3)
  month-view.tsx        -- Month view component (Phase 4.4)
  backlog-filters.tsx   -- Backlog filter bar (Phase 5.2)
  skeleton.tsx          -- Loading skeleton components (Phase 7.2)
  toast.tsx             -- Toast notification component (Phase 7.2)

app/api/
  notifications/
    subscribe/
      route.ts          -- Push subscription management (Phase 8.2)
    preferences/
      route.ts          -- Notification preferences CRUD (Phase 8.3)
    send/
      route.ts          -- Cron-triggered notification sender (Phase 8.4)
  analytics/
    summary/
      route.ts          -- Analytics summary API (Phase 9.1)

components/
  settings-view.tsx     -- Notification settings UI (Phase 8.3)
  dashboard-view.tsx    -- Dashboard & analytics view (Phase 9.2)

drizzle.config.ts       -- Drizzle Kit config (Phase 0.1)
.env.example            -- Environment variables template (Phase 0.2)
public/
  manifest.json         -- PWA manifest (Phase 8.1)
  sw.js                 -- Service Worker for push notifications (Phase 8.1)
vercel.json             -- Cron job configuration (Phase 8.4)
```

---

## Files to Modify

```
package.json            -- Add drizzle-orm, postgres, drizzle-kit, @dnd-kit/* (Phases 0.1, 6.1)
lib/types.ts            -- Rewrite with DB-aligned types (Phase 0.7)
lib/helpers.ts          -- Update to work with new types + recurrence logic (Phase 2.3)
lib/hooks.ts            -- Remove useChecks (Phase 2.9)
app/home/page.tsx       -- API hooks, view switcher, FAB, date nav (Phases 2.4, 3.1, 4.1, 4.2, 5.1, 5.6)
components/focus-view.tsx    -- API data, 3-state, arrows, swipe, como, protocolo (Phases 2.5, 4.5-4.7, 6.4)
components/timeline-view.tsx -- API data, 3-state, long press, DnD, como indicator (Phases 2.6, 3.8, 4.8, 6.1)
components/emergency-view.tsx -- API data, CRUD buttons (Phases 2.7, 5.7)
components/backlog-view.tsx  -- API data, filters, badges, inbox, long press (Phases 2.8, 5.2-5.5)
app/globals.css         -- New animations for transitions, shake, slide-left/right (Phases 6.4-6.5)
app/layout.tsx          -- PWA manifest link (Phase 7.7)
```

---

## Estimated Effort per Phase

| Phase | Description | Items | Estimated Complexity |
|-------|-------------|-------|---------------------|
| 0 | Foundation Infrastructure | 8 items | High (DB setup, schema, types, recurrence logic) |
| 1 | Data Layer (API Routes) | 9 items | Medium (standard CRUD routes) |
| 2 | Core Client Migration | 9 items | High (rewire entire frontend data flow) |
| 3 | Task CRUD & Interaction | 8 items | High (forms, modals, validation, long press) |
| 4 | Views & Navigation | 8 items | Medium-High (2 new views, gestures) |
| 5 | Backlog, Inbox & Protocols | 9 items | Medium (filters, protocol CRUD) |
| 6 | DnD & Animations | 5 items | Medium (library integration, CSS) |
| 7 | Polish & Edge Cases | 7 items | Medium (scattered improvements) |
| 8 | Notifications & Reminders | 4 items | High (Service Worker, web-push, cron) |
| 9 | Dashboard & Analytics | 3 items | Medium (charts, calculations, UI) |
| 10 | Future Enhancements | 4 items | Variable (stretch goals) |

**Total tracked items: 74** (excluding Phase 10 stretch goals: 70)
