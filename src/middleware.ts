import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "site_access";
const ADMIN_COOKIE = "admin_access";

function isPublicPath(pathname: string) {
  return (
    pathname === "/unlock" ||
    pathname === "/api/unlock" ||
    pathname === "/admin/login" ||
    pathname === "/api/admin/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const hasAdminAccess = request.cookies.get(ADMIN_COOKIE)?.value === "granted";
    if (hasAdminAccess) {
      return NextResponse.next();
    }
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/admin/login";
    redirectUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  const hasAccess = request.cookies.get(ACCESS_COOKIE)?.value === "granted";

  if (hasAccess) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/unlock";
  redirectUrl.searchParams.set("next", pathname + request.nextUrl.search);

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: "/((?!_next|favicon.ico|robots.txt|sitemap.xml).*)",
};
