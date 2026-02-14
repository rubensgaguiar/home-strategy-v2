import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taskCompletions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, jsonError } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

// DELETE /api/completions/[id] — Delete specific completion (undo action)
export async function DELETE(request: NextRequest, { params }: Params) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const completionId = parseInt(id, 10);
  if (isNaN(completionId)) return jsonError('Invalid completion ID', 400);

  const [deleted] = await db
    .delete(taskCompletions)
    .where(eq(taskCompletions.id, completionId))
    .returning();

  if (!deleted) return jsonError('Completion not found', 404);
  return NextResponse.json({ success: true, id: deleted.id });
}
