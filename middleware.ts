import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Allow the coming soon page through
  if (path === "/coming-soon") {
    return NextResponse.next();
  }

  // Block everything else
  return NextResponse.redirect(new URL("/coming-soon", request.url));
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};