import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

// GET /api/contingencies — List all category contingencies
export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const result = await db.query.categoryContingencies.findMany();
  return NextResponse.json(result);
}
