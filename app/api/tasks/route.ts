import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { tasks, taskRecurrences, taskSteps } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { requireAuth, jsonError } from '@/lib/api-utils';

// GET /api/tasks — List all tasks with recurrences and steps
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category');
  const person = searchParams.get('person');
  const frequencyType = searchParams.get('frequency_type');

  const result = await db.query.tasks.findMany({
    with: {
      recurrence: true,
      steps: { orderBy: (steps, { asc }) => [asc(steps.sortOrder)] },
      protocol: true,
    },
    orderBy: (tasks, { asc }) => [asc(tasks.sortOrder), asc(tasks.createdAt)],
  });

  let filtered = result;

  if (category) {
    filtered = filtered.filter((t) => t.category === category);
  }
  if (person) {
    filtered = filtered.filter((t) => t.primaryPerson === person);
  }
  if (frequencyType) {
    filtered = filtered.filter((t) => t.recurrence?.type === frequencyType);
  }

  return NextResponse.json(filtered);
}

// POST /api/tasks — Create task + recurrence + steps in a transaction
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const { name, category, primaryPerson, secondaryPerson, planB, optional, repetitions, protocolId,
    recurrence, steps } = body as {
    name?: string;
    category?: string;
    primaryPerson?: string;
    secondaryPerson?: string;
    planB?: string;
    optional?: boolean;
    repetitions?: string;
    protocolId?: number;
    recurrence?: {
      type: string;
      interval?: number;
      daysOfWeek?: number[];
      dayOfMonth?: number;
      monthOfYear?: number;
      weekOfMonth?: number;
      periods: string[];
    };
    steps?: { description: string }[];
  };

  // Validation
  if (!name || name.length < 2) return jsonError('name is required (min 2 chars)', 400);
  if (!category) return jsonError('category is required', 400);
  if (!primaryPerson) return jsonError('primaryPerson is required', 400);
  if (!recurrence?.type) return jsonError('recurrence.type is required', 400);

  // Calculate sort_order: max + 1
  const maxSortResult = await db
    .select({ maxSort: sql<number>`COALESCE(MAX(${tasks.sortOrder}), -1)` })
    .from(tasks);
  const nextSortOrder = (maxSortResult[0]?.maxSort ?? -1) + 1;

  // Transaction: create task + recurrence + optional steps
  const result = await db.transaction(async (tx) => {
    const [insertedTask] = await tx.insert(tasks).values({
      name: name as string,
      category: category as 'cozinha' | 'pedro' | 'ester' | 'casa' | 'pessoal' | 'espiritual' | 'compras',
      primaryPerson: primaryPerson as 'rubens' | 'diene' | 'juntos',
      secondaryPerson: (secondaryPerson as 'rubens' | 'diene' | 'juntos') || null,
      repetitions: (repetitions as string) || null,
      planB: (planB as string) || null,
      optional: optional ?? false,
      sortOrder: nextSortOrder,
      protocolId: protocolId ?? null,
    }).returning();

    const [insertedRecurrence] = await tx.insert(taskRecurrences).values({
      taskId: insertedTask.id,
      type: recurrence!.type as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none',
      interval: recurrence!.interval ?? 1,
      daysOfWeek: recurrence!.daysOfWeek ?? null,
      dayOfMonth: recurrence!.dayOfMonth ?? null,
      monthOfYear: recurrence!.monthOfYear ?? null,
      weekOfMonth: recurrence!.weekOfMonth ?? null,
      periods: (recurrence!.periods ?? []) as ('MA' | 'TA' | 'NO')[],
    }).returning();

    let insertedSteps: typeof taskSteps.$inferSelect[] = [];
    if (steps && steps.length > 0) {
      insertedSteps = await tx.insert(taskSteps).values(
        steps.map((s, i) => ({
          taskId: insertedTask.id,
          description: s.description,
          sortOrder: i,
        }))
      ).returning();
    }

    return { ...insertedTask, recurrence: insertedRecurrence, steps: insertedSteps };
  });

  return NextResponse.json(result, { status: 201 });
}
