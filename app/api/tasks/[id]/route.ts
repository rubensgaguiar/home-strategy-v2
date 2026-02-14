import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, taskRecurrences, taskSteps } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, jsonError } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

// GET /api/tasks/[id] — Return task with recurrence, steps, and protocol
export async function GET(request: NextRequest, { params }: Params) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) return jsonError('Invalid task ID', 400);

  const result = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      recurrence: true,
      steps: { orderBy: (steps, { asc }) => [asc(steps.sortOrder)] },
      protocol: true,
    },
  });

  if (!result) return jsonError('Task not found', 404);
  return NextResponse.json(result);
}

// PUT /api/tasks/[id] — Update task + recurrence + steps (replace steps array)
export async function PUT(request: NextRequest, { params }: Params) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) return jsonError('Invalid task ID', 400);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const { name, category, primaryPerson, secondaryPerson, planB, optional, repetitions, protocolId,
    sortOrder, recurrence, steps } = body as {
    name?: string;
    category?: string;
    primaryPerson?: string;
    secondaryPerson?: string | null;
    planB?: string | null;
    optional?: boolean;
    repetitions?: string | null;
    protocolId?: number | null;
    sortOrder?: number;
    recurrence?: {
      type: string;
      interval?: number;
      daysOfWeek?: number[] | null;
      dayOfMonth?: number | null;
      monthOfYear?: number | null;
      weekOfMonth?: number | null;
      periods: string[];
    };
    steps?: { description: string }[];
  };

  const result = await db.transaction(async (tx) => {
    // Update task fields
    const taskUpdate: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) taskUpdate.name = name;
    if (category !== undefined) taskUpdate.category = category;
    if (primaryPerson !== undefined) taskUpdate.primaryPerson = primaryPerson;
    if (secondaryPerson !== undefined) taskUpdate.secondaryPerson = secondaryPerson;
    if (planB !== undefined) taskUpdate.planB = planB;
    if (optional !== undefined) taskUpdate.optional = optional;
    if (repetitions !== undefined) taskUpdate.repetitions = repetitions;
    if (protocolId !== undefined) taskUpdate.protocolId = protocolId;
    if (sortOrder !== undefined) taskUpdate.sortOrder = sortOrder;

    const [updatedTask] = await tx
      .update(tasks)
      .set(taskUpdate)
      .where(eq(tasks.id, taskId))
      .returning();

    if (!updatedTask) return null;

    // Update recurrence if provided
    let updatedRecurrence = null;
    if (recurrence) {
      const recurrenceUpdate: Record<string, unknown> = {
        type: recurrence.type,
        interval: recurrence.interval ?? 1,
        daysOfWeek: recurrence.daysOfWeek ?? null,
        dayOfMonth: recurrence.dayOfMonth ?? null,
        monthOfYear: recurrence.monthOfYear ?? null,
        weekOfMonth: recurrence.weekOfMonth ?? null,
        periods: recurrence.periods ?? [],
      };

      [updatedRecurrence] = await tx
        .update(taskRecurrences)
        .set(recurrenceUpdate)
        .where(eq(taskRecurrences.taskId, taskId))
        .returning();
    }

    // Replace steps if provided
    let updatedSteps: typeof taskSteps.$inferSelect[] = [];
    if (steps !== undefined) {
      await tx.delete(taskSteps).where(eq(taskSteps.taskId, taskId));
      if (steps.length > 0) {
        updatedSteps = await tx.insert(taskSteps).values(
          steps.map((s, i) => ({
            taskId,
            description: s.description,
            sortOrder: i,
          }))
        ).returning();
      }
    }

    return { ...updatedTask, recurrence: updatedRecurrence, steps: updatedSteps };
  });

  if (!result) return jsonError('Task not found', 404);
  return NextResponse.json(result);
}

// DELETE /api/tasks/[id] — Delete task (cascades recurrence + steps, keeps completions)
export async function DELETE(request: NextRequest, { params }: Params) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const taskId = parseInt(id, 10);
  if (isNaN(taskId)) return jsonError('Invalid task ID', 400);

  const [deleted] = await db.delete(tasks).where(eq(tasks.id, taskId)).returning();
  if (!deleted) return jsonError('Task not found', 404);

  return NextResponse.json({ success: true, id: deleted.id });
}
