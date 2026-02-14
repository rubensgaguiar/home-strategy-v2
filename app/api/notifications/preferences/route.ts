import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notificationPreferences } from '@/lib/db/schema';
import { requireAuth, jsonError } from '@/lib/api-utils';
import { eq } from 'drizzle-orm';

// GET /api/notifications/preferences — Get user's notification preferences
export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const result = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userEmail, authResult.email),
  });

  // Return defaults if no preferences saved yet
  if (!result) {
    return NextResponse.json({
      enabled: false,
      periodStart: true,
      periodEnd: true,
      dailySummary: true,
    });
  }

  return NextResponse.json({
    enabled: result.enabled,
    periodStart: result.periodStart,
    periodEnd: result.periodEnd,
    dailySummary: result.dailySummary,
  });
}

// PUT /api/notifications/preferences — Update notification preferences
export async function PUT(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const body = await req.json();
  const { enabled, periodStart, periodEnd, dailySummary } = body;

  if (typeof enabled !== 'boolean') {
    return jsonError('enabled (boolean) is required', 400);
  }

  await db
    .insert(notificationPreferences)
    .values({
      userEmail: authResult.email,
      enabled,
      periodStart: periodStart ?? true,
      periodEnd: periodEnd ?? true,
      dailySummary: dailySummary ?? true,
    })
    .onConflictDoUpdate({
      target: notificationPreferences.userEmail,
      set: {
        enabled,
        periodStart: periodStart ?? true,
        periodEnd: periodEnd ?? true,
        dailySummary: dailySummary ?? true,
      },
    });

  return NextResponse.json({ ok: true });
}
