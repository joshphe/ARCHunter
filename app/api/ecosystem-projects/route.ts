import { NextResponse } from 'next/server';
import { listProjects } from '@/lib/projects-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await listProjects(true), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not load ecosystem projects:', error instanceof Error ? error.message : 'unknown database error');
    return NextResponse.json({ error: 'Project directory is temporarily unavailable.' }, { status: 503 });
  }
}
