import {cookies} from 'next/headers';
import {authConfig, authCookie, authFailure, CHALLENGE_COOKIE, sameOrigin, smallJson} from '@/lib/admin-auth';
import {AuthError, issueCode} from '@/lib/email-auth-core';

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await smallJson(request), config = authConfig();
    if (typeof body?.email !== 'string' || body.email.trim().toLowerCase() !== config.email) {
      throw new AuthError('该邮箱无法用于管理员登录。', 403);
    }
    const result = await issueCode({db: config.db, email: config.email, secret: config.secret,
      ip: request.headers.get('cf-connecting-ip') || 'unknown',
      previousToken: (await cookies()).get(CHALLENGE_COOKIE)?.value,
      send: async (email, code, deliveryId) => {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', signal: AbortSignal.timeout(12000),
          headers: {'Authorization': `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `witch-otp/${deliveryId}`},
          body: JSON.stringify({from: config.from, to: [email], subject: '《魔女：狂猎》管理员登录验证码',
            text: `你的管理员登录验证码是：${code}\n\n验证码在10分钟内有效，仅可使用一次。请在发送验证码的浏览器中输入。\n请勿将验证码转发给他人。若非你本人操作，请忽略此邮件。`})
        });
        if (!response.ok) throw new Error('Mail delivery failed');
        const payload: {id?: string} = await response.json();
        if (!payload.id) throw new Error('Mail delivery unconfirmed');
      }
    });
    return Response.json({message: '验证码已发送，请查看邮箱。', expiresIn: result.expiresIn, retryAfter: result.retryAfter}, {
      headers: {'Cache-Control': 'no-store', 'Set-Cookie': authCookie(CHALLENGE_COOKIE, result.token, result.expiresIn)}
    });
  } catch (error) { return authFailure(error); }
}
