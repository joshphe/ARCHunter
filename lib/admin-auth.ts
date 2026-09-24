import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const cookieName = 'arcwatch_admin';
const sessionAgeSeconds = 60 * 60 * 24 * 7;

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured.');
  return secret;
}

function sign(payload: string) {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export async function isAdmin() {
  try {
    const value = (await cookies()).get(cookieName)?.value;
    if (!value) return false;
    const [payload, signature] = value.split('.');
    if (!payload || !signature) return false;
    const expected = sign(payload);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return false;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number; role?: string };
    return data.role === 'admin' && typeof data.exp === 'number' && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function setAdminSession() {
  const exp = Math.floor(Date.now() / 1000) + sessionAgeSeconds;
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp })).toString('base64url');
  (await cookies()).set(cookieName, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: sessionAgeSeconds,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(cookieName);
}

export function verifyAdminPassword(password: unknown) {
  const expected = process.env.ADMIN_PASSWORD;
  if (typeof password !== 'string' || !expected || password.length > 512) return false;
  const actualBuffer = Buffer.from(password);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return origin === new URL(request.url).origin;
}
