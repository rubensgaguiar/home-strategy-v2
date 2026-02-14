import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { taskCompletions } from '@/lib/db/schema';
import { and, gte, lte, eq } from 'drizzle-orm';
import { requireAuth, jsonError } from '@/lib/api-utils';

// GET /api/completions/history?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&task_id=optional
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  if (!startDate || !endDate) {
    return jsonError('start_date and end_date query parameters are required (YYYY-MM-DD)', 400);
  }

  const taskId = searchParams.get('task_id');

  const conditions = [
    gte(taskCompletions.date, startDate),
    lte(taskCompletions.date, endDate),
  ];

  if (taskId) {
    const id = parseInt(taskId, 10);
    if (!isNaN(id)) {
      conditions.push(eq(taskCompletions.taskId, id));
    }
  }

  const result = await db
    .select()
    .from(taskCompletions)
    .where(and(...conditions));

  return NextResponse.json(result);
}
