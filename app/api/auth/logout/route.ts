import {env} from 'cloudflare:workers';
import {cookies} from 'next/headers';
import {authCookie, authFailure, CHALLENGE_COOKIE, SESSION_COOKIE, sameOrigin} from '@/lib/admin-auth';
import {revokeSession} from '@/lib/email-auth-core';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (env.DB) await revokeSession(env.DB, (await cookies()).get(SESSION_COOKIE)?.value || '');
    const headers = new Headers({'Cache-Control': 'no-store'});
    headers.append('Set-Cookie', authCookie(SESSION_COOKIE, '', 0));
    headers.append('Set-Cookie', authCookie(CHALLENGE_COOKIE, '', 0));
    return Response.json({ok: true}, {headers});
  } catch (error) { return authFailure(error); }
}
