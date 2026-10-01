import { NextResponse } from 'next/server';
import { listRugProjects } from '@/lib/rug-projects';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return NextResponse.json(await listRugProjects(), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Rug archive is temporarily unavailable.' }, { status: 503 });
  }
}
