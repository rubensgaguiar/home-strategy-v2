import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Lazy-initialized database connection. Deferred so the module can be
 * imported at build time without POSTGRES_URL being set (Next.js static
 * analysis imports route modules during build).
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    if (!_db) {
      const connectionString = process.env.POSTGRES_URL;
      if (!connectionString) {
        throw new Error('POSTGRES_URL environment variable is required');
      }
      const client = postgres(connectionString, { ssl: 'require' });
      _db = drizzle(client, { schema });
    }
    return Reflect.get(_db, prop, receiver);
  },
});
