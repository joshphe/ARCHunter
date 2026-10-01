import { NextResponse } from 'next/server';
import { isAdmin, isSameOrigin } from '@/lib/admin-auth';
import { archiveRugProject } from '@/lib/rug-projects';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (!body || typeof body.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug) ||
    typeof body.reasonEn !== 'string' || typeof body.reasonZh !== 'string' ||
    !body.reasonEn.trim() || !body.reasonZh.trim() || body.reasonEn.length > 5000 || body.reasonZh.length > 5000) {
    return NextResponse.json({ error: 'Project slug and both incident descriptions are required (max 5,000 characters each).' }, { status: 400 });
  }
  try {
    await archiveRugProject(body.slug, body.reasonEn.trim(), body.reasonZh.trim());
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not archive this project.' }, { status: 500 });
  }
}
