## Build & Run

- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm start`

## Validation

- Tests: `npm test`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`

## Database

- Generate migrations: `npm run db:generate`
- Run migrations: `npm run db:migrate`
- Push schema: `npm run db:push`
- Seed data: `npm run db:seed`
- Studio: `npm run db:studio`

## Operational Notes

- Date construction: Use `new Date(year, month, day)` not `new Date('YYYY-MM-DD')` to avoid UTC-vs-local timezone bugs
- Auth can be disabled via `NEXT_PUBLIC_AUTH_DISABLED=true` in `.env.local`
- Test framework: vitest (config in `vitest.config.ts`)

### Codebase Patterns

- Schema: `lib/db/schema.ts` (Drizzle ORM with PostgreSQL)
- Types: `lib/types.ts` (both DB-inferred and legacy types coexist during migration)
- Legacy data: `lib/tasks.ts`, `lib/protocols.ts`, `lib/contingencies.ts` (still used by components, will be replaced in Phase 2)
