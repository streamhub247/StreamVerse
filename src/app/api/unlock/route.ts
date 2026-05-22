import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "site_access";

export async function POST(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;

  if (!password) {
    return NextResponse.json({ message: "Password not configured" }, { status: 500 });
  }

  const body = (await request.json()) as { password?: string };

  if (!body.password || body.password !== password) {
    return NextResponse.json({ message: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ACCESS_COOKIE,
    value: "granted",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
