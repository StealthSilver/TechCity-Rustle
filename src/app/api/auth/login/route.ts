import { NextResponse } from "next/server";
import {
  authConfigured,
  credentialsMatch,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth";

export async function POST(request: Request) {
  if (!authConfigured()) {
    return NextResponse.json(
      { error: "Sign-in is not configured." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const username = typeof record.username === "string" ? record.username : "";
  const password = typeof record.password === "string" ? record.password : "";

  if (!credentialsMatch(username, password)) {
    return NextResponse.json(
      { error: "Incorrect username or password." },
      { status: 401 },
    );
  }

  const canonical = process.env.AUTH_USERNAME?.trim();
  if (!canonical) {
    return NextResponse.json(
      { error: "Sign-in is not configured." },
      { status: 500 },
    );
  }
  const token = await signSession(canonical);
  const response = NextResponse.json({ username: canonical });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
