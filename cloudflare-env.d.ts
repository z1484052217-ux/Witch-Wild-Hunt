declare namespace Cloudflare { interface Env {
  DB?: D1Database; BUCKET?: R2Bucket; ADMIN_EMAIL?: string;
  ADMIN_AUTH_MODE?: string; ADMIN_OTP_EMAIL?: string; ADMIN_OTP_SECRET?: string;
  RESEND_API_KEY?: string; EMAIL_FROM?: string;
} }
