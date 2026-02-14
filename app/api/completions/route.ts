import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taskCompletions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, jsonError } from '@/lib/api-utils';

// GET /api/completions?date=YYYY-MM-DD&user_email=optional
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = request.nextUrl;
  const date = searchParams.get('date');
  if (!date) return jsonError('date query parameter is required (YYYY-MM-DD)', 400);

  const userEmail = searchParams.get('user_email');

  const conditions = [eq(taskCompletions.date, date)];
  if (userEmail) {
    conditions.push(eq(taskCompletions.userEmail, userEmail));
  }

  const result = await db
    .select()
    .from(taskCompletions)
    .where(and(...conditions));

  return NextResponse.json(result);
}

// POST /api/completions — UPSERT: create or update completion by (task_id, date)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const { email } = authResult;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const { task_id, date, status } = body as {
    task_id?: number;
    date?: string;
    status?: string;
  };

  if (!task_id) return jsonError('task_id is required', 400);
  if (!date) return jsonError('date is required (YYYY-MM-DD)', 400);
  if (!status || !['done', 'not_done'].includes(status)) {
    return jsonError('status must be "done" or "not_done"', 400);
  }

  // UPSERT: insert or update on conflict (task_id, date)
  const [result] = await db
    .insert(taskCompletions)
    .values({
      taskId: task_id,
      date,
      status: status as 'done' | 'not_done',
      userEmail: email,
    })
    .onConflictDoUpdate({
      target: [taskCompletions.taskId, taskCompletions.date],
      set: {
        status: status as 'done' | 'not_done',
        userEmail: email,
        createdAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json(result, { status: 201 });
}
