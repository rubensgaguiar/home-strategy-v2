import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { protocols } from '@/lib/db/schema';
import { requireAuth, jsonError } from '@/lib/api-utils';

// GET /api/protocols — List all protocols
export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const result = await db.query.protocols.findMany({
    orderBy: (protocols, { asc }) => [asc(protocols.createdAt)],
  });

  return NextResponse.json(result);
}

// POST /api/protocols — Create protocol
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const { name, trigger, actions, color, icon } = body as {
    name?: string;
    trigger?: string;
    actions?: string[];
    color?: string;
    icon?: string;
  };

  if (!name) return jsonError('name is required', 400);
  if (!trigger) return jsonError('trigger is required', 400);
  if (!actions || actions.length < 1) return jsonError('actions must have at least 1 item', 400);
  if (!color) return jsonError('color is required', 400);

  const [result] = await db.insert(protocols).values({
    name,
    trigger,
    actions,
    color,
    icon: icon || null,
  }).returning();

  return NextResponse.json(result, { status: 201 });
}
