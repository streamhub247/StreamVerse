import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

const ADMIN_COOKIE = "admin_access";
const ALERT_ID = "global_overlay_alert";

type OverlayAlertPayload = {
  title?: string;
  message: string;
  enabled: boolean;
  size?: "sm" | "md" | "lg";
  backgroundColor?: string;
  textColor?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
  target?: "all" | "home" | "admin" | "custom";
  customPaths?: string[];
  imageSize?: "sm" | "md" | "lg";
  imageSizePercent?: number;
  updatedAt: string;
};

const VALID_SIZES: NonNullable<OverlayAlertPayload["size"]>[] = ["sm", "md", "lg"];
const VALID_TARGETS: NonNullable<OverlayAlertPayload["target"]>[] = ["all", "home", "admin", "custom"];
const VALID_IMAGE_SIZES: NonNullable<OverlayAlertPayload["imageSize"]>[] = ["sm", "md", "lg"];

function requireAdmin(request: NextRequest) {
  const hasAccess = request.cookies.get(ADMIN_COOKIE)?.value === "granted";
  if (!hasAccess) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function safeColor(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) {
    return auth;
  }

  const db = await getDatabase();
  const collection = db.collection<{
    _id: string;
    title?: string;
    message: string;
    enabled: boolean;
    size?: OverlayAlertPayload["size"];
    backgroundColor?: string;
    textColor?: string;
    imageUrl?: string;
    ctaText?: string;
    ctaUrl?: string;
    updatedAt: string;
  }>("site_overlays");
  const record = await collection.findOne({ _id: ALERT_ID });

  return NextResponse.json({
    title: record?.title ?? "",
    message: record?.message ?? "",
    enabled: record?.enabled ?? false,
    size: record?.size ?? "md",
    backgroundColor: record?.backgroundColor ?? "",
    textColor: record?.textColor ?? "",
    imageUrl: record?.imageUrl ?? "",
    ctaText: record?.ctaText ?? "",
    ctaUrl: record?.ctaUrl ?? "",
    updatedAt: record?.updatedAt ?? null,
  });
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) {
    return auth;
  }

  const body = (await request.json()) as Partial<OverlayAlertPayload>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const enabled = Boolean(body.enabled);
  const size = body.size ?? "md";
  const safeSize = VALID_SIZES.includes(size) ? size : "md";
  const backgroundColor = safeColor(body.backgroundColor);
  const textColor = safeColor(body.textColor);
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const ctaText = typeof body.ctaText === "string" ? body.ctaText.trim() : "";
  const ctaUrl = typeof body.ctaUrl === "string" ? body.ctaUrl.trim() : "";
  const target = (body.target as OverlayAlertPayload["target"]) ?? "all";
  const safeTarget = VALID_TARGETS.includes(target) ? target : "all";
  const customPaths = Array.isArray(body.customPaths) ? body.customPaths.map((s) => String(s).trim()).filter(Boolean) : [];
  const imageSize = (body.imageSize as OverlayAlertPayload["imageSize"]) ?? "md";
  const safeImageSize = VALID_IMAGE_SIZES.includes(imageSize) ? imageSize : "md";
  const imageSizePercent = Number.isFinite(Number(body.imageSizePercent))
    ? Math.max(1, Math.min(2000, Number(body.imageSizePercent)))
    : undefined;

  const db = await getDatabase();
  const collection = db.collection<{
    _id: string;
    title?: string;
    message: string;
    enabled: boolean;
    size?: OverlayAlertPayload["size"];
    backgroundColor?: string;
    textColor?: string;
    imageUrl?: string;
    ctaText?: string;
    ctaUrl?: string;
    target?: OverlayAlertPayload["target"];
    customPaths?: string[];
    imageSize?: OverlayAlertPayload["imageSize"];
    imageSizePercent?: number;
    updatedAt: string;
  }>("site_overlays");

  await collection.updateOne(
    { _id: ALERT_ID },
    {
      $set: {
        title,
        message,
        enabled,
        size: safeSize,
        backgroundColor,
        textColor,
        imageUrl: imageUrl || undefined,
        ctaText: ctaText || undefined,
        ctaUrl: ctaUrl || undefined,
          target: safeTarget,
          customPaths: customPaths.length ? customPaths : undefined,
          imageSize: safeImageSize,
          imageSizePercent: imageSizePercent,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
