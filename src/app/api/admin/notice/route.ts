import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

const ADMIN_COOKIE = "admin_access";
const NOTICE_ID = "global_notice";

type NoticePayload = {
  message: string;
  enabled: boolean;
  tone: "info" | "warning" | "success" | "danger";
  updatedAt: string;
};

function requireAdmin(request: NextRequest) {
  const hasAccess = request.cookies.get(ADMIN_COOKIE)?.value === "granted";
  if (!hasAccess) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) {
    return auth;
  }

  const db = await getDatabase();
  const collection = db.collection<{
    _id: string;
    message: string;
    enabled: boolean;
    tone?: NoticePayload["tone"];
    updatedAt: string;
  }>("site_notices");
  const record = await collection.findOne({ _id: NOTICE_ID });

  return NextResponse.json({
    message: record?.message ?? "",
    enabled: record?.enabled ?? false,
    tone: record?.tone ?? "warning",
    updatedAt: record?.updatedAt ?? null,
  });
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) {
    return auth;
  }

  const body = (await request.json()) as Partial<NoticePayload>;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const enabled = Boolean(body.enabled);
  const tone = body.tone ?? "warning";
  const validTones: NoticePayload["tone"][] = ["info", "warning", "success", "danger"];
  const safeTone = validTones.includes(tone) ? tone : "warning";

  const db = await getDatabase();
  const collection = db.collection<{
    _id: string;
    message: string;
    enabled: boolean;
    tone: NoticePayload["tone"];
    updatedAt: string;
  }>("site_notices");

  await collection.updateOne(
    { _id: NOTICE_ID },
    {
      $set: {
        message,
        enabled,
        tone: safeTone,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
