import Link from "next/link";
import Script from "next/script";
import { createHash } from "crypto";
import { getDatabase } from "@/lib/mongodb";
import StreamPlayer from "./stream-player";

export const revalidate = 15;

const STREAMS_APIS = [
  { label: "Primary", url: "https://api.ppv.to/api/streams" },
  // { label: "Backup 1", url: "https://your-backup-api.example.com/api/streams" },
  // { label: "Backup 2", url: "https://your-backup-api.example.com/api/streams" },
];

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
  tag: string;
  source_tag?: string;
  poster?: string;
  blurhash?: string;
  colors?: string[];
  uri_name: string;
  starts_at?: number;
  ends_at?: number;
  always_live?: number | boolean;
  locale?: string;
  category_name?: string;
  iframe: string;
  viewers?: string | number;
  description?: string;
  substreams?: StreamItem[];
};

type CategoryGroup = {
  category: string;
  streams: StreamItem[];
};

type StreamsResponse = {
  streams: CategoryGroup[];
};

type StreamSource = {
  label: string;
  src: string;
  kind?: "embed" | "m3u8";
  origin: "admin" | "ppv" | "streamed";
  key: string;
};

type AdminStreamSource = {
  id: string;
  label?: string;
  url: string;
  kind: "embed" | "m3u8";
  createdAt: string;
};

type StreamOverride = {
  key: string;
  label?: string;
  url?: string;
  kind?: "embed" | "m3u8";
  rank?: number;
  hidden?: boolean;
};

type StreamedMatchSource = {
  source: string;
  id: string | number;
};

type StreamedMatch = {
  id: string | number;
  title: string;
  category?: string;
  date?: number;
  popular?: boolean;
  poster?: string;
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

type Props = {
  params: Promise<{ slug: string[] | string }>;
};

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

async function fetchOverrides(uriName: string): Promise<StreamOverride[]> {
  try {
    const db = await getDatabase();
    const collection = db.collection<{ uri_name: string; overrides: StreamOverride[] }>(
      "admin_stream_overrides"
    );
    const record = await collection.findOne({ uri_name: uriName });
    return record?.overrides ?? [];
  } catch {
    return [];
  }
}

async function fetchAdminSources(uriName: string): Promise<AdminStreamSource[]> {
  try {
    const db = await getDatabase();
    const collection = db.collection<{ uri_name: string; sources: AdminStreamSource[] }>(
      "admin_stream_sources"
    );
    const record = await collection.findOne({ uri_name: uriName });
    return record?.sources ?? [];
  } catch {
    return [];
  }
}

async function fetchStreamedSources(streamName: string, streamSlug: string): Promise<StreamSource[]> {
  const endpoints = STREAMED_MATCH_ENDPOINTS.map((path) => `${STREAMED_API_BASE}${path}`);

  const results = await Promise.allSettled(
    endpoints.map(async (url) => {
      const res = await fetch(url, { next: { revalidate: 15 } });
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
        { next: { revalidate: 15 } }
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
          return {
            label: `${streamName.toUpperCase()} • ${parts.join(" ")}`,
            src: stream.embedUrl,
            kind: "embed",
            origin: "streamed",
            key: `streamed:${hashSource(stream.embedUrl)}`,
          } as StreamSource;
        });
    })
  );

  const sources: StreamSource[] = [];
  for (const result of streamResults) {
    if (result.status !== "fulfilled" || !result.value) {
      continue;
    }
    const items = Array.isArray(result.value) ? result.value : [result.value];
    for (const item of items) {
      const exists = sources.some((source) => source.src === item.src);
      if (!exists) {
        sources.push(item);
      }
    }
  }

  return sources;
}

export default async function StreamPage({ params }: Props) {
  const { slug: slugValue } = await params;
  const slug = Array.isArray(slugValue)
    ? slugValue
    : typeof slugValue === "string"
      ? [slugValue]
      : [];
  const uri_name = slug.join("/");

  let stream: StreamItem | undefined;
  let streamSources: StreamSource[] = [];

  try {
    const results = await Promise.allSettled(
      STREAMS_APIS.map(async (api) => {
        const res = await fetch(api.url, { next: { revalidate: 15 } });
        if (!res.ok) {
          return null;
        }
        const data = (await res.json()) as StreamsResponse;
        const all = normalizeStreams(data);
        const found = all.find((s) => s.uri_name === uri_name);
        return found ? { api, stream: found } : null;
      })
    );

    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) {
        continue;
      }

      const { api, stream: foundStream } = result.value;

      if (!stream) {
        stream = foundStream;
      }

      if (foundStream.iframe) {
        const exists = streamSources.some((source) => source.src === foundStream.iframe);
        if (!exists) {
          streamSources.push({
            label: `${foundStream.tag.toUpperCase()} • ${api.label}`,
            src: foundStream.iframe,
            kind: "embed",
            origin: "ppv",
            key: `ppv:${hashSource(foundStream.iframe)}`,
          });
        }
      }
    }

    if (stream) {
      const adminSources = await fetchAdminSources(uri_name);
      for (const source of adminSources) {
        const exists = streamSources.some((item) => item.src === source.url);
        if (!exists) {
          const kindLabel = source.kind === "m3u8" ? "M3U8" : "Embed";
          streamSources.push({
            label: `${stream.tag.toUpperCase()} • ${source.label ?? kindLabel}`,
            src: source.url,
            kind: source.kind,
            origin: "admin",
            key: `admin:${source.id}`,
          });
        }
      }

      const streamedSources = await fetchStreamedSources(stream.name, uri_name);
      for (const source of streamedSources) {
        const exists = streamSources.some((item) => item.src === source.src);
        if (!exists) {
          streamSources.push(source);
        }
      }

      const overrides = await fetchOverrides(uri_name);
      if (overrides.length > 0) {
        const overrideMap = new Map(overrides.map((item) => [item.key, item]));
        streamSources = streamSources.map((source) => {
          const key = source.key ?? `${source.origin}:${hashSource(source.src)}`;
          const override = overrideMap.get(key);
          if (!override) {
            return { ...source, key };
          }
          return {
            ...source,
            key,
            label: override.label ?? source.label,
            src: override.url ?? source.src,
            kind: override.kind ?? source.kind,
          };
        });

        streamSources = streamSources.filter((source) => !overrideMap.get(source.key)?.hidden);

        streamSources = streamSources
          .map((source, index) => ({
            source,
            index,
            rank: overrideMap.get(source.key)?.rank,
          }))
          .sort((a, b) => {
            const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
            const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
            if (rankA !== rankB) {
              return rankA - rankB;
            }
            return a.index - b.index;
          })
          .map((item) => item.source);
      }
    }
  } catch {
    stream = undefined;
  }

  if (!stream) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-400">
            ← Back to Home
          </Link>
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-linear-to-br from-zinc-950/80 to-zinc-900/30 p-10 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-600/15 text-red-400">
              <span className="text-xl">⛔</span>
            </div>
            <h2 className="mt-4 text-2xl font-bold">Stream not found</h2>
            <p className="mt-2 text-zinc-400">
              We couldn't locate that stream. URI: <span className="text-zinc-300">{uri_name}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (streamSources.length === 0 && stream.iframe) {
    streamSources = [
      {
        label: `${stream.tag.toUpperCase()} • Primary`,
        src: stream.iframe,
        kind: "embed",
        origin: "ppv",
        key: `ppv:${hashSource(stream.iframe)}`,
      },
    ];
  }

  const starts = stream.starts_at
    ? new Date(stream.starts_at * 1000).toLocaleString()
    : "TBD";
  const posterUrl = stream.poster ?? "";
  const viewersLabel = `${String(stream.viewers ?? "0").toLocaleString()} viewers`;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Top Navigation */}
      <div className="w-full bg-black/60 backdrop-blur sticky top-0 z-40 py-4 px-6 border-b border-zinc-800/80">
        <div className="w-full flex items-center justify-between">
          <Link href="/" className="text-sm text-red-500 hover:text-red-400 font-medium">
            ← Back to Home
          </Link>
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800/70 bg-zinc-900/60 px-3 py-1">
              {stream.category_name || stream.tag}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-800/70 bg-zinc-900/60 px-3 py-1">
              {starts}
            </span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-900">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={posterUrl ? { backgroundImage: `url(${posterUrl})` } : undefined}
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/80 via-black/70 to-[#050505]" />
        <div className="relative w-full px-6 py-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
                <span className="inline-flex items-center gap-2 rounded-full border border-red-600/40 bg-red-600/10 px-3 py-1 text-red-400">
                  Live
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-3 py-1">
                  {stream.tag}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/60 px-3 py-1">
                  {viewersLabel}
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-bold md:text-5xl">{stream.name}</h1>
              <p className="mt-3 text-zinc-300">
                {stream.description || "Enjoy this live stream. Click play to start watching."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500">
                Watch Now
              </button>
              <button className="rounded-full border border-zinc-700/80 bg-zinc-900/50 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500">
                Add to Watchlist
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="w-full px-6 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            {/* Player Section */}
            <div className="rounded-2xl border border-zinc-800/80 bg-black/80 shadow-2xl shadow-black/60 w-full">
              <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  Streaming now
                </div>
                <div className="text-xs text-zinc-500">HD • Auto</div>
              </div>
              <StreamPlayer sources={streamSources} />
            </div>
            <div className="w-full">
              <Script
                id="ad-native-vertical"
                src="https://pl29523897.effectivecpmnetwork.com/caf69c5551a00e68cd92971666f554dc/invoke.js"
                strategy="afterInteractive"
              />
              <div id="container-caf69c5551a00e68cd92971666f554dc" />
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-zinc-500 uppercase tracking-wide">Live chat</div>
                <span className="inline-flex items-center gap-2 text-[11px] text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Connected
                </span>
              </div>
              <div className="h-120 space-y-3 overflow-y-auto pr-2 text-sm text-zinc-300">
                <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                  Chat will appear here once the integration is enabled.
                </div>
                <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                  Keep the vibes high and enjoy the match. 🎉
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <input
                  disabled
                  placeholder="Sign in to join chat"
                  className="w-full rounded-full border border-white/10 bg-black/60 px-4 py-2 text-xs text-white/60 outline-none"
                />
                <button
                  disabled
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 space-y-8">
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-lg font-semibold">Stream details</h2>
              <span className="text-xs text-zinc-500">{streamSources.length} sources available</span>
            </div>
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">League</span>
                  <span className="font-semibold text-white/90">{stream.tag}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Category</span>
                  <span className="font-semibold">{stream.category_name || stream.tag}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Start time</span>
                  <span className="font-semibold">{starts}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Locale</span>
                  <span className="font-semibold">{stream.locale || "Global"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Viewers</span>
                  <span className="font-semibold">{viewersLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Status</span>
                  <span className="inline-flex items-center gap-2 text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Live
                  </span>
                </div>
              </div>
              {streamSources.length > 0 && (
                <div className="sm:col-span-2 flex flex-wrap gap-2 pt-2">
                  {streamSources.map((source) => (
                    <span
                      key={source.src}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/80"
                    >
                      {source.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-zinc-800/70 bg-linear-to-br from-zinc-950/80 to-zinc-900/20 p-6">
            <h2 className="text-lg font-semibold mb-3">About this Stream</h2>
            <p className="text-zinc-300 leading-relaxed">
              {stream.description || "Enjoy this live stream. Click play to start watching."}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
