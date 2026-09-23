export interface AuthStatement {
  bind(...values: unknown[]): AuthStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}
export interface AuthDatabase { prepare(sql: string): AuthStatement; }
export type MailSender = (email: string, code: string, deliveryId: string) => Promise<void>;
export const CODE_SECONDS = 600;
export const SESSION_SECONDS = 43200;
export class AuthError extends Error {
  constructor(message: string, public status = 400, public retryAfter = 0) { super(message); }
}
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(bytes)).map(n => n.toString(16).padStart(2, '0')).join('');
export function randomToken() { return hex(crypto.getRandomValues(new Uint8Array(32))); }
export function randomCode() {
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0] >= 4294000000);
  return String(value[0] % 1000000).padStart(6, '0');
}
export async function tokenHash(token: string) { return hex(await crypto.subtle.digest('SHA-256', encoder.encode(token))); }
async function mac(secret: string, text: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(text)));
}
function sameHash(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}
const isToken = (token: string) => /^[a-f0-9]{64}$/.test(token);

async function limit(db: AuthDatabase, key: string, max: number, seconds: number, now: number) {
  const granted = await db.prepare(`INSERT INTO admin_auth_limits(key,count,expires_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET
      count=CASE WHEN expires_at<=? THEN 1 ELSE count+1 END,
      expires_at=CASE WHEN expires_at<=? THEN excluded.expires_at ELSE expires_at END
    WHERE expires_at<=? OR count<? RETURNING count`)
    .bind(key, now + seconds, now, now, now, max).first();
  if (!granted) {
    const row = await db.prepare('SELECT expires_at FROM admin_auth_limits WHERE key=?').bind(key).first<{expires_at:number}>();
    throw new AuthError('操作较频繁，请稍后再试。', 429, Math.max(1, (row?.expires_at || now + seconds) - now));
  }
}

export async function issueCode(options: {
  db: AuthDatabase; email: string; secret: string; ip: string;
  send: MailSender; previousToken?: string; now?: number;
}) {
  const {db, email, secret, ip, send, previousToken} = options;
  const now = options.now ?? Math.floor(Date.now() / 1000);
  if (secret.length < 32) throw new AuthError('邮箱登录尚未配置完成。', 503);
  await limit(db, await mac(secret, `send-minute:${email}`), 1, 60, now);
  await limit(db, await mac(secret, `send-hour:${email}`), 6, 3600, now);
  await limit(db, await mac(secret, `send-day:${email}`), 20, 86400, now);
  await limit(db, await mac(secret, `send-ip:${ip}`), 10, 3600, now);
  await db.prepare('DELETE FROM admin_otp_challenges WHERE expires_at<=?').bind(now).run();
  await db.prepare('DELETE FROM admin_sessions WHERE expires_at<=?').bind(now).run();
  await db.prepare('DELETE FROM admin_auth_limits WHERE expires_at<=?').bind(now).run();
  const token = randomToken(), id = await tokenHash(token), code = randomCode();
  const codeHash = await mac(secret, `code:${id}:${email}:${code}`);
  await db.prepare('INSERT INTO admin_otp_challenges(id,email,code_hash,expires_at,attempts,sent,created_at) VALUES(?,?,?,?,0,0,?)')
    .bind(id, email, codeHash, now + CODE_SECONDS, now).run();
  try {
    await send(email, code, id);
    await db.prepare('UPDATE admin_otp_challenges SET sent=1 WHERE id=?').bind(id).run();
  } catch {
    await db.prepare('DELETE FROM admin_otp_challenges WHERE id=?').bind(id).run();
    throw new AuthError('验证码发送失败，请稍后再试。', 503, 60);
  }
  if (previousToken && isToken(previousToken)) {
    await db.prepare('DELETE FROM admin_otp_challenges WHERE id=?').bind(await tokenHash(previousToken)).run();
  }
  return {token, expiresIn: CODE_SECONDS, retryAfter: 60};
}

export async function verifyCode(options: {
  db: AuthDatabase; email: string; secret: string; token: string; code: string; now?: number;
}) {
  const {db, email, secret, token, code} = options;
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const invalid = () => new AuthError('验证码错误或已失效，请检查后重试，或重新获取。');
  if (secret.length < 32 || !isToken(token) || !/^\d{6}$/.test(code)) throw invalid();
  const id = await tokenHash(token);
  const attempt = await db.prepare(`UPDATE admin_otp_challenges SET attempts=attempts+1
    WHERE id=? AND email=? AND sent=1 AND expires_at>? AND attempts<5 RETURNING code_hash`)
    .bind(id, email, now).first<{code_hash:string}>();
  if (!attempt) throw invalid();
  const expected = await mac(secret, `code:${id}:${email}:${code}`);
  if (!sameHash(attempt.code_hash, expected)) throw invalid();
  const consumed = await db.prepare('DELETE FROM admin_otp_challenges WHERE id=? AND email=? AND sent=1 AND expires_at>? RETURNING id')
    .bind(id, email, now).first();
  if (!consumed) throw invalid();
  const session = randomToken();
  await db.prepare('INSERT INTO admin_sessions(token_hash,email,expires_at,created_at) VALUES(?,?,?,?)')
    .bind(await tokenHash(session), email, now + SESSION_SECONDS, now).run();
  return session;
}

export async function sessionUser(db: AuthDatabase, token: string, email: string, now = Math.floor(Date.now() / 1000)) {
  if (!isToken(token)) return null;
  const row = await db.prepare('SELECT email FROM admin_sessions WHERE token_hash=? AND email=? AND expires_at>?')
    .bind(await tokenHash(token), email, now).first<{email:string}>();
  return row ? {email: row.email} : null;
}
export async function revokeSession(db: AuthDatabase, token: string) {
  if (isToken(token)) await db.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await tokenHash(token)).run();
}
