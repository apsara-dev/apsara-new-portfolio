import crypto from "node:crypto";

const SECRET_KEY =
  process.env.ADMIN_SECRET_KEY ||
  process.env.GMAIL_APP_PASSWORD ||
  "apsara-portfolio-hmac-secret-key-2026";

// In-memory rate limiting & brute-force protection stores
const rateLimitBucket = new Map<
  string,
  { count: number; resetAt: number }
>();
const otpFailedAttempts = new Map<string, number>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "127.0.0.1";
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = rateLimitBucket.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitBucket.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function recordOtpFailure(email: string): { lockedOut: boolean; attemptsLeft: number } {
  const clean = email.trim().toLowerCase();
  const current = (otpFailedAttempts.get(clean) || 0) + 1;
  otpFailedAttempts.set(clean, current);
  const maxAttempts = 5;
  return {
    lockedOut: current >= maxAttempts,
    attemptsLeft: Math.max(0, maxAttempts - current),
  };
}

export function clearOtpFailures(email: string): void {
  otpFailedAttempts.delete(email.trim().toLowerCase());
}

export function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(String(a || ""), "utf-8");
  const bufB = Buffer.from(String(b || ""), "utf-8");
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Generates an HMAC-SHA256 signed token with expiration.
 */
export function createSignedToken(
  scope: "admin" | "otp_verified",
  subject: string,
  ttlMs = 12 * 60 * 60 * 1000
): string {
  const expiresAt = Date.now() + ttlMs;
  const payload = `${scope}:${subject}:${expiresAt}`;
  const sig = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}:${sig}`, "utf-8").toString("base64url");
}

export function verifySignedToken(
  token: string | null | undefined,
  expectedScope: "admin" | "otp_verified"
): { valid: boolean; subject?: string } {
  if (!token) return { valid: false };
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 4) return { valid: false };

    const [scope, subject, expiresStr, providedSig] = parts;
    if (scope !== expectedScope) return { valid: false };

    const expiresAt = Number(expiresStr);
    if (!expiresAt || Date.now() > expiresAt) return { valid: false };

    const payload = `${scope}:${subject}:${expiresStr}`;
    const expectedSig = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(payload)
      .digest("hex");

    if (!timingSafeCompare(providedSig, expectedSig)) {
      return { valid: false };
    }
    return { valid: true, subject };
  } catch {
    return { valid: false };
  }
}

function parseCookieHeader(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/**
 * Verifies if an incoming HTTP Request has valid Admin authorization
 * (via Authorization: Bearer <token> OR HttpOnly cookie 'apsara_admin_token').
 */
export function verifyAdminRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (verifySignedToken(token, "admin").valid) return true;
  }

  const cookieToken = parseCookieHeader(
    request.headers.get("cookie"),
    "apsara_admin_token"
  );
  if (cookieToken && verifySignedToken(cookieToken, "admin").valid) {
    return true;
  }

  return false;
}

export function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeHeaderField(str: string, maxLen = 180): string {
  return String(str ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, maxLen);
}

export function isValidEmail(email: string): boolean {
  const clean = String(email ?? "").trim();
  if (clean.length < 5 || clean.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
}

export function maskPhoneNumber(phone: string): string {
  const clean = String(phone || "").trim();
  if (clean.length <= 9) return "Protected (Verify OTP)";
  return clean.slice(0, 9) + " •••••";
}

export function createStatelessOtpChallenge(params: {
  email: string;
  otp: string;
  name: string;
  company: string;
}): string {
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const cleanEmail = params.email.trim().toLowerCase();
  const dataPart = Buffer.from(
    JSON.stringify({
      e: cleanEmail,
      n: params.name.trim(),
      c: (params.company || "").trim(),
      x: expiresAt,
    }),
    "utf-8"
  ).toString("base64url");

  const sig = crypto
    .createHmac("sha256", SECRET_KEY)
    .update(`otp:${dataPart}:${params.otp.trim()}`)
    .digest("hex");

  return `${dataPart}.${sig}`;
}

export function verifyStatelessOtpChallenge(
  challengeToken: string | undefined,
  email: string,
  otpCode: string
): { valid: boolean; viewer_name?: string; company?: string; reason?: string } {
  if (!challengeToken || !challengeToken.includes(".")) {
    return { valid: false };
  }
  try {
    const [dataPart, providedSig] = challengeToken.split(".");
    const parsed = JSON.parse(
      Buffer.from(dataPart, "base64url").toString("utf-8")
    );
    if (!parsed || parsed.e !== email.trim().toLowerCase()) {
      return { valid: false };
    }
    if (Date.now() > Number(parsed.x)) {
      return { valid: false };
    }
    const expectedSig = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(`otp:${dataPart}:${otpCode.trim()}`)
      .digest("hex");

    if (!timingSafeCompare(providedSig, expectedSig)) {
      return { valid: false };
    }
    return {
      valid: true,
      viewer_name: parsed.n,
      company: parsed.c,
    };
  } catch {
    return { valid: false };
  }
}
