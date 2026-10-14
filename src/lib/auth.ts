import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "studio_session";
export const SESSION_MAX_AGE = 60 * 60 * 24;

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export function authConfigured() {
  return Boolean(
    process.env.AUTH_USERNAME &&
      process.env.AUTH_PASSWORD &&
      process.env.AUTH_SECRET,
  );
}

function safeEqual(left: string, right: string) {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

export function credentialsMatch(username: string, password: string) {
  const expectedUser = process.env.AUTH_USERNAME;
  const expectedPassword = process.env.AUTH_PASSWORD;
  if (!expectedUser || !expectedPassword || !username.trim() || !password) {
    return false;
  }

  return (
    safeEqual(username.trim().toLowerCase(), expectedUser.trim().toLowerCase()) &&
    safeEqual(password, expectedPassword)
  );
}

export async function signSession(username: string) {
  const secret = authSecret();
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }

  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE)
    .sign(secret);
}

export async function verifySession(token: string) {
  const secret = authSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
