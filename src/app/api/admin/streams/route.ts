import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

const ADMIN_COOKIE = "admin_access";

type StreamSource = {
  id: string;
  label?: string;
  url: string;
  kind: "embed" | "m3u8";
  createdAt: string;
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

export async function GET(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) {
    return auth;
  }

  const uriName = request.nextUrl.searchParams.get("uri_name");
  if (!uriName) {
    return NextResponse.json({ message: "uri_name is required" }, { status: 400 });
  }

  const db = await getDatabase();
  const collection = db.collection<{ uri_name: string; sources: StreamSource[] }>("admin_stream_sources");

  const record = await collection.findOne({ uri_name: uriName });
  return NextResponse.json({ sources: record?.sources ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) {
    return auth;
  }

  const body = (await request.json()) as {
    uri_name?: string;
    label?: string;
    url?: string;
    kind?: "embed" | "m3u8";
  };

  if (!body.uri_name || !body.url || !body.kind) {
    return NextResponse.json({ message: "uri_name, url, and kind are required" }, { status: 400 });
  }

  const parsedUrl = parseUrl(body.url);
  if (!parsedUrl) {
    return NextResponse.json({ message: "Invalid URL" }, { status: 400 });
  }

  if (body.kind !== "embed" && body.kind !== "m3u8") {
    return NextResponse.json({ message: "Invalid source kind" }, { status: 400 });
  }

  const source: StreamSource = {
    id: crypto.randomUUID(),
    label: body.label?.trim() || undefined,
    url: parsedUrl,
    kind: body.kind,
    createdAt: new Date().toISOString(),
  };

  const db = await getDatabase();
  const collection = db.collection<{ uri_name: string; sources: StreamSource[] }>("admin_stream_sources");

  await collection.updateOne(
    { uri_name: body.uri_name },
    {
      $setOnInsert: { uri_name: body.uri_name },
      $push: { sources: source },
    },
    { upsert: true }
  );

  return NextResponse.json({ source });
}

export async function DELETE(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) {
    return auth;
  }

  const body = (await request.json()) as { uri_name?: string; sourceId?: string };

  if (!body.uri_name || !body.sourceId) {
    return NextResponse.json({ message: "uri_name and sourceId are required" }, { status: 400 });
  }

  const db = await getDatabase();
  const collection = db.collection<{ uri_name: string; sources: StreamSource[] }>("admin_stream_sources");

  await collection.updateOne(
    { uri_name: body.uri_name },
    { $pull: { sources: { id: body.sourceId } } }
  );

  return NextResponse.json({ ok: true });
}
