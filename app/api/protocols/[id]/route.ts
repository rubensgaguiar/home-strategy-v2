import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { protocols, tasks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, jsonError } from '@/lib/api-utils';

type Params = { params: Promise<{ id: string }> };

// PUT /api/protocols/[id] — Update protocol
export async function PUT(request: NextRequest, { params }: Params) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const protocolId = parseInt(id, 10);
  if (isNaN(protocolId)) return jsonError('Invalid protocol ID', 400);

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
    icon?: string | null;
  };

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) update.name = name;
  if (trigger !== undefined) update.trigger = trigger;
  if (actions !== undefined) update.actions = actions;
  if (color !== undefined) update.color = color;
  if (icon !== undefined) update.icon = icon;

  const [result] = await db
    .update(protocols)
    .set(update)
    .where(eq(protocols.id, protocolId))
    .returning();

  if (!result) return jsonError('Protocol not found', 404);
  return NextResponse.json(result);
}

// DELETE /api/protocols/[id] — Delete protocol + set protocol_id=null on linked tasks
export async function DELETE(request: NextRequest, { params }: Params) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const protocolId = parseInt(id, 10);
  if (isNaN(protocolId)) return jsonError('Invalid protocol ID', 400);

  await db.transaction(async (tx) => {
    // Unlink any tasks that reference this protocol
    await tx
      .update(tasks)
      .set({ protocolId: null, updatedAt: new Date() })
      .where(eq(tasks.protocolId, protocolId));

    // Delete the protocol
    await tx.delete(protocols).where(eq(protocols.id, protocolId));
  });

  return NextResponse.json({ success: true, id: protocolId });
}
