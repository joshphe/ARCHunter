import { NextResponse } from 'next/server';
import { isSameOrigin, setAdminSession, verifyAdminPassword } from '@/lib/admin-auth';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!verifyAdminPassword(password)) return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  try {
    await setAdminSession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Admin login is not configured.' }, { status: 503 });
  }
}
