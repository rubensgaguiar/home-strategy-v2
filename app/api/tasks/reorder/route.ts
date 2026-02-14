import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, jsonError } from '@/lib/api-utils';

// PATCH /api/tasks/reorder — Batch update sort_order
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const items = body as { task_id: number; sort_order: number }[];
  if (!Array.isArray(items) || items.length === 0) {
    return jsonError('Body must be a non-empty array of { task_id, sort_order }', 400);
  }

  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx
        .update(tasks)
        .set({ sortOrder: item.sort_order, updatedAt: new Date() })
        .where(eq(tasks.id, item.task_id));
    }
  });

  return NextResponse.json({ success: true, updated: items.length });
}
