import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { isProductPath } from "@/lib/product-paths";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProductPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const username = token ? await verifySession(token) : null;
  if (username) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/certificate", "/offer-letter", "/appreciation"],
};
