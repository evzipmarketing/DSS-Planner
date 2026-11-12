import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const themes = new Set(["a", "b", "c", "d", "e"]);

export function proxy(request: NextRequest) {
  const theme = request.nextUrl.searchParams.get("theme")?.toLowerCase() ?? "";
  const requestHeaders = new Headers(request.headers);
  if (themes.has(theme)) requestHeaders.set("x-dss-theme", theme);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|api/).*)"],
};
