import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { getDatabase } from "@/lib/mongodb";

const ADMIN_COOKIE = "admin_access";
const STREAMS_APIS = [{ label: "Primary", url: "https://api.ppv.to/api/streams" }];
const STREAMED_API_BASE = "https://streamed.pk";
const STREAMED_MATCH_ENDPOINTS = [
  "/api/matches/live",
  "/api/matches/live/popular",
  "/api/matches/all-today",
  "/api/matches/all-today/popular",
  "/api/matches/all/popular",
  "/api/matches/all",
];

type StreamItem = {
  id: number;
  name: string;
  uri_name: string;
  iframe?: string;
  category_name?: string;
  substreams?: StreamItem[];
};

type CategoryGroup = {
  category: string;
  streams: StreamItem[];
};

type StreamsResponse = {
  streams: CategoryGroup[];
};

type StreamedMatchSource = {
  source: string;
  id: string | number;
};

type StreamedMatch = {
  id: string | number;
  title: string;
  teams?: {
    home?: { name?: string };
    away?: { name?: string };
  } | null;
  sources: StreamedMatchSource[];
};

type StreamedStream = {
  id: string | number;
  streamNo?: number;
  language?: string;
  hd?: boolean;
  embedUrl: string;
  source: string;
};

type AdminSource = {
  id: string;
  label?: string;
  url: string;
  kind: "embed" | "m3u8";
  createdAt: string;
};

type OverrideSource = {
  key: string;
  label?: string;
  url?: string;
  kind?: "embed" | "m3u8";
  rank?: number;
  hidden?: boolean;
};

type ManagedSource = {
  key: string;
  label: string;
  url: string;
  kind: "embed" | "m3u8";
  origin: "admin" | "ppv" | "streamed";
  createdAt?: string;
  rank?: number;
  hidden?: boolean;
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

function normalizeStreams(data: StreamsResponse): StreamItem[] {
  return data.streams.flatMap((category) =>
    category.streams.flatMap((stream) => {
      const base: StreamItem = {
        ...stream,
        category_name: stream.category_name ?? category.category,
      };

      const substreams = (stream.substreams ?? []).map((sub) => ({
        ...base,
        ...sub,
        id: sub.id ?? base.id,
        uri_name: sub.uri_name,
        iframe: sub.iframe,
      }));

      return [base, ...substreams];
    })
  );
}

function normalizeTitle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function titlesMatch(a: string, b: string) {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  if (!left || !right) {
    return false;
  }
  return left.includes(right) || right.includes(left);
}

function matchTeams(streamName: string, match: StreamedMatch) {
  const home = match.teams?.home?.name;
  const away = match.teams?.away?.name;
  if (!home || !away) {
    return false;
  }
  const normalizedName = normalizeTitle(streamName);
  return normalizedName.includes(normalizeTitle(home)) && normalizedName.includes(normalizeTitle(away));
}

function matchStream(streamName: string, streamSlug: string, match: StreamedMatch) {
  if (titlesMatch(streamName, match.title) || titlesMatch(streamName, String(match.id))) {
    return true;
  }

  if (streamSlug) {
    if (titlesMatch(streamSlug, match.title) || titlesMatch(streamSlug, String(match.id))) {
      return true;
    }
  }

  return matchTeams(streamName, match);
}

function extractMatchArray(payload: unknown): StreamedMatch[] {
  if (Array.isArray(payload)) {
    return payload as StreamedMatch[];
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidates = [record.matches, record.data, record.results];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as StreamedMatch[];
      }
    }
  }
  return [];
}

function normalizeStreamedStreams(payload: unknown): StreamedStream[] {
  if (Array.isArray(payload)) {
    return payload as StreamedStream[];
  }
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      return record.data as StreamedStream[];
    }
    if (record.data && typeof record.data === "object") {
      return [record.data as StreamedStream];
    }
    if ("embedUrl" in record) {
      return [record as StreamedStream];
    }
  }
  return [];
}

function hashSource(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

async function getOverrides(uriName: string) {
  const db = await getDatabase();
  const collection = db.collection<{ uri_name: string; overrides: OverrideSource[] }>("admin_stream_overrides");
  const record = await collection.findOne({ uri_name: uriName });
  return record?.overrides ?? [];
}

async function upsertOverride(uriName: string, override: OverrideSource) {
  const db = await getDatabase();
  const collection = db.collection<{ uri_name: string; overrides: OverrideSource[] }>("admin_stream_overrides");
  const record = await collection.findOne({ uri_name: uriName });
  const existing = record?.overrides ?? [];
  const map = new Map(existing.map((item) => [item.key, item]));
  map.set(override.key, { ...map.get(override.key), ...override });
  const overrides = Array.from(map.values());
  await collection.updateOne(
    { uri_name: uriName },
    { $set: { overrides }, $setOnInsert: { uri_name: uriName } },
    { upsert: true }
  );
}

async function saveOrder(uriName: string, order: string[]) {
  const db = await getDatabase();
  const collection = db.collection<{ uri_name: string; overrides: OverrideSource[] }>("admin_stream_overrides");
  const record = await collection.findOne({ uri_name: uriName });
  const existing = record?.overrides ?? [];
  const map = new Map(existing.map((item) => [item.key, item]));
  order.forEach((key, index) => {
    const current = map.get(key) ?? { key };
    map.set(key, { ...current, rank: index });
  });
  const overrides = Array.from(map.values());
  await collection.updateOne(
    { uri_name: uriName },
    { $set: { overrides }, $setOnInsert: { uri_name: uriName } },
    { upsert: true }
  );
}

async function fetchStreamedSources(streamName: string, streamSlug: string): Promise<ManagedSource[]> {
  const endpoints = STREAMED_MATCH_ENDPOINTS.map((path) => `${STREAMED_API_BASE}${path}`);

  const results = await Promise.allSettled(
    endpoints.map(async (url) => {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        return [] as StreamedMatch[];
      }
      const payload = (await res.json()) as unknown;
      return extractMatchArray(payload);
    })
  );

  const matches = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  const match = matches.find((item) => matchStream(streamName, streamSlug, item));
  if (!match || !Array.isArray(match.sources)) {
    return [];
  }

  const streamResults = await Promise.allSettled(
    match.sources.map(async (source) => {
      const res = await fetch(
        `${STREAMED_API_BASE}/api/stream/${source.source}/${source.id}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        return null;
      }
      const payload = (await res.json()) as unknown;
      const streams = normalizeStreamedStreams(payload);
      if (streams.length === 0) {
        return null;
      }
      return streams
        .filter((stream) => Boolean(stream.embedUrl))
        .map((stream) => {
          const parts = [source.source.toUpperCase()];
          if (stream.language) {
            parts.push(stream.language.toUpperCase());
          }
          if (stream.hd) {
            parts.push("HD");
          }
          if (stream.streamNo) {
            parts.push(`#${stream.streamNo}`);
          }
          const url = stream.embedUrl;
          return {
            key: `streamed:${hashSource(url)}`,
            label: `Streamed • ${parts.join(" ")}`,
            url,
            kind: "embed" as const,
            origin: "streamed" as const,
          };
        });
    })
  );

  const sources: ManagedSource[] = [];
  for (const result of streamResults) {
    if (result.status !== "fulfilled" || !result.value) {
      continue;
    }
    const items = Array.isArray(result.value) ? result.value : [result.value];
    for (const item of items) {
      const exists = sources.some((source) => source.url === item.url);
      if (!exists) {
        sources.push(item);
      }
    }
  }

  return sources;
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

  let streamName: string | null = null;
  const ppvSources: ManagedSource[] = [];

  const results = await Promise.allSettled(
    STREAMS_APIS.map(async (api) => {
      const res = await fetch(api.url, { cache: "no-store" });
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as StreamsResponse;
      const all = normalizeStreams(data);
      const found = all.find((s) => s.uri_name === uriName);
      return found ? { api, stream: found } : null;
    })
  );

  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value) {
      continue;
    }

    const { api, stream } = result.value;
    if (!streamName) {
      streamName = stream.name;
    }
    if (stream.iframe) {
      const url = stream.iframe;
      ppvSources.push({
        key: `ppv:${hashSource(url)}`,
        label: api.label,
        url,
        kind: "embed",
        origin: "ppv",
      });
    }
  }

  const db = await getDatabase();
  const adminCollection = db.collection<{ uri_name: string; sources: AdminSource[] }>("admin_stream_sources");
  const adminRecord = await adminCollection.findOne({ uri_name: uriName });
  const adminSources: ManagedSource[] = (adminRecord?.sources ?? []).map((source) => ({
    key: `admin:${source.id}`,
    label: source.label ?? "Admin Source",
    url: source.url,
    kind: source.kind,
    origin: "admin",
    createdAt: source.createdAt,
  }));

  const streamedSources = streamName ? await fetchStreamedSources(streamName, uriName) : [];

  const overrides = await getOverrides(uriName);
  const overrideMap = new Map(overrides.map((item) => [item.key, item]));

  const allSources = [...adminSources, ...ppvSources, ...streamedSources].map((source) => {
    const override = overrideMap.get(source.key);
    return {
      ...source,
      label: override?.label ?? source.label,
      url: override?.url ?? source.url,
      kind: override?.kind ?? source.kind,
      rank: override?.rank,
      hidden: override?.hidden,
    };
  });

  const ordered = allSources
    .map((source, index) => ({ source, index }))
    .sort((a, b) => {
      const rankA = a.source.rank ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.source.rank ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return a.index - b.index;
    })
    .map((item) => item.source);

  return NextResponse.json({ sources: ordered });
}

export async function PATCH(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) {
    return auth;
  }

  const body = (await request.json()) as {
    uri_name?: string;
    key?: string;
    label?: string;
    url?: string;
    kind?: "embed" | "m3u8";
    hidden?: boolean;
  };

  if (!body.uri_name || !body.key) {
    return NextResponse.json({ message: "uri_name and key are required" }, { status: 400 });
  }

  const updates: OverrideSource = { key: body.key };

  if (typeof body.label === "string") {
    updates.label = body.label.trim();
  }

  if (body.url) {
    const parsed = parseUrl(body.url);
    if (!parsed) {
      return NextResponse.json({ message: "Invalid URL" }, { status: 400 });
    }
    updates.url = parsed;
  }

  if (body.kind) {
    if (body.kind !== "embed" && body.kind !== "m3u8") {
      return NextResponse.json({ message: "Invalid source kind" }, { status: 400 });
    }
    updates.kind = body.kind;
  }

  if (typeof body.hidden === "boolean") {
    updates.hidden = body.hidden;
  }

  if (body.key.startsWith("admin:")) {
    const adminId = body.key.replace("admin:", "");
    const db = await getDatabase();
    const collection = db.collection<{ uri_name: string; sources: AdminSource[] }>("admin_stream_sources");

    const updateFields: Partial<AdminSource> = {};
    if (updates.label !== undefined) {
      updateFields.label = updates.label || undefined;
    }
    if (updates.url) {
      updateFields.url = updates.url;
    }
    if (updates.kind) {
      updateFields.kind = updates.kind;
    }

    await collection.updateOne(
      { uri_name: body.uri_name, "sources.id": adminId },
      {
        $set: Object.entries(updateFields).reduce<Record<string, string>>((acc, [key, value]) => {
          acc[`sources.$.${key}`] = value as string;
          return acc;
        }, {}),
      }
    );

    if (updates.hidden !== undefined) {
      await upsertOverride(body.uri_name, { key: body.key, hidden: updates.hidden });
    }
  } else {
    await upsertOverride(body.uri_name, updates);
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  const auth = requireAdmin(request);
  if (auth) {
    return auth;
  }

  const body = (await request.json()) as { uri_name?: string; order?: string[] };

  if (!body.uri_name || !Array.isArray(body.order)) {
    return NextResponse.json({ message: "uri_name and order are required" }, { status: 400 });
  }

  await saveOrder(body.uri_name, body.order);
  return NextResponse.json({ ok: true });
}
