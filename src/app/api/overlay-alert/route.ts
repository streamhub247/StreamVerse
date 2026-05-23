import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

const ALERT_ID = "global_overlay_alert";

export async function GET() {
  const db = await getDatabase();
  const collection = db.collection<{
    _id: string;
    title?: string;
    message: string;
    enabled: boolean;
    size?: "sm" | "md" | "lg";
    backgroundColor?: string;
    textColor?: string;
    imageUrl?: string;
    ctaText?: string;
    ctaUrl?: string;
  }>("site_overlays");
  const record = await collection.findOne({ _id: ALERT_ID });

  if (!record?.enabled || !record.message) {
    return NextResponse.json({ enabled: false });
  }

  return NextResponse.json({
    enabled: true,
    title: record.title ?? "",
    message: record.message,
    size: record.size ?? "md",
    backgroundColor: record.backgroundColor ?? "",
    textColor: record.textColor ?? "",
    imageUrl: record.imageUrl ?? "",
    ctaText: record.ctaText ?? "",
    ctaUrl: record.ctaUrl ?? "",
    target: record.target ?? "all",
    customPaths: record.customPaths ?? [],
    imageSize: record.imageSize ?? "md",
    imageSizePercent: record.imageSizePercent ?? null,
  });
}
