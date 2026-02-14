import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/**
 * Gets the authenticated session, or returns null if auth is disabled.
 * When auth is disabled, returns a mock session with a default email.
 */
export async function getSession() {
  if (process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true') {
    return { user: { email: 'dev@local', name: 'Dev User' } };
  }
  return auth();
}

/**
 * Returns the user email from session, or a 401 response if not authenticated.
 */
export async function requireAuth(): Promise<{ email: string } | NextResponse> {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return { email };
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
