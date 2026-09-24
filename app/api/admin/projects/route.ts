import { NextResponse } from 'next/server';
import { isAdmin, isSameOrigin } from '@/lib/admin-auth';
import { listProjects, saveProject } from '@/lib/projects-db';
import { validateProjectInput } from '@/lib/project-schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    return NextResponse.json(await listProjects(false), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not load admin projects:', error instanceof Error ? error.message : 'unknown database error');
    return NextResponse.json({ error: 'Project directory is temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const result = validateProjectInput(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  try {
    await saveProject(result.project);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Could not save ecosystem project:', error instanceof Error ? error.message : 'unknown database error');
    return NextResponse.json({ error: 'Could not save the project.' }, { status: 500 });
  }
}
