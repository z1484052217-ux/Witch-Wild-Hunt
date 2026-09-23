import {env} from 'cloudflare:workers';
import {cookies} from 'next/headers';
import {AuthError, sessionUser} from './email-auth-core';

export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-witch_admin' : 'witch_admin';
export const CHALLENGE_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-witch_challenge' : 'witch_challenge';
export function authConfig() {
  const email = env.ADMIN_OTP_EMAIL?.trim().toLowerCase();
  if (!email || !env.RESEND_API_KEY || !env.EMAIL_FROM || !env.ADMIN_OTP_SECRET || env.ADMIN_OTP_SECRET.length < 32 || !env.DB) {
    throw new AuthError('邮箱登录尚未配置完成，请稍后再试。', 503);
  }
  return {email, secret: env.ADMIN_OTP_SECRET, db: env.DB, apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM};
}
export async function adminUser() {
  // A self-hosted Worker has no trusted Sites identity gateway. Only our
  // server-validated email session can grant administrator access.
  if (!env.DB || !env.ADMIN_OTP_EMAIL) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value || '';
  return sessionUser(env.DB, token, env.ADMIN_OTP_EMAIL.trim().toLowerCase());
}
export function sameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new AuthError('请求来源无效。', 403);
}
export async function smallJson(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new AuthError('请求格式无效。');
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError('请求内容为空。');
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const part = await reader.read(); if (part.done) break;
    length += part.value.byteLength;
    if (length > 2048) { await reader.cancel(); throw new AuthError('请求内容过长。', 413); }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new AuthError('请求格式无效。'); }
}
export function authFailure(error: unknown) {
  const e = error instanceof AuthError ? error : new AuthError('登录服务暂不可用，请稍后重试。', 503);
  return Response.json({error: e.message, retryAfter: e.retryAfter}, {status: e.status, headers: {
    'Cache-Control': 'no-store', ...(e.retryAfter ? {'Retry-After': String(e.retryAfter)} : {})
  }});
}
export function authCookie(name: string, value: string, seconds: number) {
  return `${name}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${seconds}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}
