import {cookies} from 'next/headers';
import {authConfig, authCookie, authFailure, CHALLENGE_COOKIE, SESSION_COOKIE, sameOrigin, smallJson} from '@/lib/admin-auth';
import {AuthError, SESSION_SECONDS, verifyCode} from '@/lib/email-auth-core';

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await smallJson(request), config = authConfig();
    if (typeof body?.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new AuthError('请输入6位数字验证码。');
    const session = await verifyCode({db: config.db, email: config.email, secret: config.secret,
      token: (await cookies()).get(CHALLENGE_COOKIE)?.value || '', code: body.code});
    const headers = new Headers({'Cache-Control': 'no-store'});
    headers.append('Set-Cookie', authCookie(SESSION_COOKIE, session, SESSION_SECONDS));
    headers.append('Set-Cookie', authCookie(CHALLENGE_COOKIE, '', 0));
    return Response.json({ok: true}, {headers});
  } catch (error) { return authFailure(error); }
}
