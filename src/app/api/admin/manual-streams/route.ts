import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

const ADMIN_COOKIE = "admin_access";

const MANUAL_COLLECTION = "admin_manual_streams";

type ManualStream = {
  id: string;
  name: string;
  uri_name: string;
  tag: string;
  category_name?: string;
  poster: string;
  starts_at: number;
  ends_at: number;
  always_live?: boolean;
  viewers?: number | string;
  description?: string;
  stream_url: string;
  stream_kind: "embed" | "m3u8";
  createdAt: string;
  updatedAt: string;
};

function requireAdmin(request: NextRequest) {
  const hasAccess = request.cookies.get(ADMIN_COOKIE)?.value === "granted";
  if (!hasAccess) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function parseUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function parseEpoch(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) {
    return auth;
  }

  const db = await getDatabase();
  const collection = db.collection<ManualStream>(MANUAL_COLLECTION);
  const streams = await collection.find().sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ streams });
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) {
    return auth;
  }

  const body = (await request.json()) as Partial<ManualStream> & {
    starts_at?: number | string;
    ends_at?: number | string;
  };

  if (!body.name || !body.tag || !body.poster || !body.stream_url || !body.stream_kind) {
    return NextResponse.json(
      { message: "name, tag, poster, stream_url, and stream_kind are required" },
      { status: 400 }
    );
  }

  const parsedPoster = parseUrl(body.poster);
  if (!parsedPoster) {
    return NextResponse.json({ message: "Invalid poster URL" }, { status: 400 });
  }

  const parsedStreamUrl = parseUrl(body.stream_url);
  if (!parsedStreamUrl) {
    return NextResponse.json({ message: "Invalid stream URL" }, { status: 400 });
  }

  if (body.stream_kind !== "embed" && body.stream_kind !== "m3u8") {
    return NextResponse.json({ message: "Invalid stream kind" }, { status: 400 });
  }

  const startsAt = parseEpoch(body.starts_at);
  const endsAt = parseEpoch(body.ends_at);
  if (startsAt === null || endsAt === null) {
    return NextResponse.json({ message: "starts_at and ends_at are required" }, { status: 400 });
  }

  const rawSlug = body.uri_name?.trim() || toSlug(body.name);
  if (!rawSlug) {
    return NextResponse.json({ message: "uri_name is required" }, { status: 400 });
  }

  const db = await getDatabase();
  const collection = db.collection<ManualStream>(MANUAL_COLLECTION);
  const existing = await collection.findOne({ uri_name: rawSlug });
  if (existing) {
    return NextResponse.json({ message: "uri_name already exists" }, { status: 409 });
  }

  const now = new Date().toISOString();

  const manual: ManualStream = {
    id: crypto.randomUUID(),
    name: body.name.trim(),
    uri_name: rawSlug,
    tag: body.tag.trim(),
    category_name: body.category_name?.trim() || undefined,
    poster: parsedPoster,
    starts_at: startsAt,
    ends_at: endsAt,
    always_live: Boolean(body.always_live),
    viewers: body.viewers ?? "0",
    description: body.description?.trim() || undefined,
    stream_url: parsedStreamUrl,
    stream_kind: body.stream_kind,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(manual);
  return NextResponse.json({ stream: manual });
}

export async function PATCH(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) {
    return auth;
  }

  const body = (await request.json()) as Partial<ManualStream> & {
    id?: string;
    starts_at?: number | string;
    ends_at?: number | string;
  };

  if (!body.id) {
    return NextResponse.json({ message: "id is required" }, { status: 400 });
  }

  const updates: Partial<ManualStream> = {};

  if (typeof body.name === "string") {
    updates.name = body.name.trim();
  }
  if (typeof body.uri_name === "string" && body.uri_name.trim()) {
    updates.uri_name = body.uri_name.trim();
  }
  if (typeof body.tag === "string") {
    updates.tag = body.tag.trim();
  }
  if (typeof body.category_name === "string") {
    updates.category_name = body.category_name.trim();
  }
  if (typeof body.poster === "string") {
    const parsedPoster = parseUrl(body.poster);
    if (!parsedPoster) {
      return NextResponse.json({ message: "Invalid poster URL" }, { status: 400 });
    }
    updates.poster = parsedPoster;
  }
  if (typeof body.stream_url === "string") {
    const parsedStreamUrl = parseUrl(body.stream_url);
    if (!parsedStreamUrl) {
      return NextResponse.json({ message: "Invalid stream URL" }, { status: 400 });
    }
    updates.stream_url = parsedStreamUrl;
  }
  if (body.stream_kind) {
    if (body.stream_kind !== "embed" && body.stream_kind !== "m3u8") {
      return NextResponse.json({ message: "Invalid stream kind" }, { status: 400 });
    }
    updates.stream_kind = body.stream_kind;
  }

  if (body.starts_at !== undefined) {
    const parsed = parseEpoch(body.starts_at);
    if (parsed === null) {
      return NextResponse.json({ message: "Invalid starts_at" }, { status: 400 });
    }
    updates.starts_at = parsed;
  }

  if (body.ends_at !== undefined) {
    const parsed = parseEpoch(body.ends_at);
    if (parsed === null) {
      return NextResponse.json({ message: "Invalid ends_at" }, { status: 400 });
    }
    updates.ends_at = parsed;
  }

  if (typeof body.always_live === "boolean") {
    updates.always_live = body.always_live;
  }

  if (body.viewers !== undefined) {
    updates.viewers = body.viewers;
  }

  if (typeof body.description === "string") {
    updates.description = body.description.trim();
  }

  updates.updatedAt = new Date().toISOString();

  const db = await getDatabase();
  const collection = db.collection<ManualStream>(MANUAL_COLLECTION);

  await collection.updateOne({ id: body.id }, { $set: updates });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) {
    return auth;
  }

  const body = (await request.json()) as { id?: string };

  if (!body.id) {
    return NextResponse.json({ message: "id is required" }, { status: 400 });
  }

  const db = await getDatabase();
  const collection = db.collection<ManualStream>(MANUAL_COLLECTION);
  await collection.deleteOne({ id: body.id });

  return NextResponse.json({ ok: true });
}
