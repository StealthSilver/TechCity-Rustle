import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const username = token ? await verifySession(token) : null;

  return NextResponse.json(
    { username },
    { headers: { "Cache-Control": "no-store" } },
  );
}
