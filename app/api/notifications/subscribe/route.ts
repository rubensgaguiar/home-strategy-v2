import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pushSubscriptions } from '@/lib/db/schema';
import { requireAuth, jsonError } from '@/lib/api-utils';
import { eq } from 'drizzle-orm';

// POST /api/notifications/subscribe — Save push subscription
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const body = await req.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return jsonError('endpoint and keys (p256dh, auth) are required', 400);
  }

  // Upsert by endpoint (a device may re-subscribe)
  await db
    .insert(pushSubscriptions)
    .values({
      userEmail: authResult.email,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userEmail: authResult.email,
      },
    });

  return NextResponse.json({ ok: true });
}

// DELETE /api/notifications/subscribe — Remove push subscription
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const body = await req.json();
  const { endpoint } = body;

  if (!endpoint) {
    return jsonError('endpoint is required', 400);
  }

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint));

  return NextResponse.json({ ok: true });
}
