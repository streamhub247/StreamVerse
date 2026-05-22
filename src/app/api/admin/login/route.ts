import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "admin_access";

export async function POST(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return NextResponse.json({ message: "Admin password not configured" }, { status: 500 });
  }

  const body = (await request.json()) as { password?: string };

  if (!body.password || body.password !== password) {
    return NextResponse.json({ message: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: "granted",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
