import { NextResponse } from 'next/server';
import { clearAdminSession, isAdmin, isSameOrigin } from '@/lib/admin-auth';

export async function GET() {
  return NextResponse.json({ authenticated: await isAdmin() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
