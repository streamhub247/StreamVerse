"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type StreamItem = {
  id: number;
  name: string;
  tag: string;
  poster: string;
  starts_at: number;
  ends_at: number;
  uri_name: string;
  viewers: string | number;
  category_name?: string;
  always_live?: number | boolean;
};

type CategoryGroup = {
  category: string;
  streams: StreamItem[];
};

type HomeData = {
  streams: CategoryGroup[];
};

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatTime(seconds: number) {
  return new Date(seconds * 1000).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(diffSeconds: number) {
  if (diffSeconds <= 0) {
    return "Starting now";
  }
  if (diffSeconds < MINUTE) {
    return "Starts in <1m";
  }
  if (diffSeconds < HOUR) {
    const mins = Math.floor(diffSeconds / MINUTE);
    return `Starts in ${mins}m`;
  }
  if (diffSeconds < DAY) {
    const hours = Math.floor(diffSeconds / HOUR);
    const mins = Math.floor((diffSeconds % HOUR) / MINUTE);
    return `Starts in ${hours}h ${mins}m`;
  }
  const days = Math.floor(diffSeconds / DAY);
  const hours = Math.floor((diffSeconds % DAY) / HOUR);
  return `Starts in ${days}d ${hours}h`;
}

function parseViewers(viewers: StreamItem["viewers"]) {
  if (typeof viewers === "number") {
    return viewers;
  }
  const parsed = Number.parseInt(String(viewers).replace(/[^0-9]/g, ""), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getStreamStatus(stream: StreamItem, now: number) {
  if (stream.always_live) {
    return { label: "LIVE", tone: "live" as const, countdown: "" };
  }

  if (stream.starts_at <= now && now <= stream.ends_at) {
    return { label: "LIVE", tone: "live" as const, countdown: "" };
  }

  if (now < stream.starts_at) {
    return {
      label: "UPCOMING",
      tone: "upcoming" as const,
      countdown: formatCountdown(stream.starts_at - now),
    };
  }

  return { label: "ENDED", tone: "ended" as const, countdown: "Replay available" };
}

function Header() {
  return (
    <header className="w-full sticky top-0 z-50 border-b border-zinc-900/80 bg-black/70 text-white backdrop-blur">
      <div className="w-full flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 rounded-lg px-3 py-1 font-bold tracking-wide shadow-lg shadow-red-600/40">
              DBS Streamz
            </div>
            <span className="hidden md:inline-flex text-xs uppercase tracking-[0.2em] text-zinc-400">
              Preview
            </span>
          </div>
          <nav className="hidden lg:flex items-center gap-2 text-sm text-zinc-300">
            <Link href="/" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-white">
              Home
            </Link>
            <Link href="/fifa-worldcup-2026" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-white">
              World Cup 26
            </Link>
            <a href="#live-now" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-white">
              Live now
            </a>
            <a href="#starting-soon" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-white">
              Starting soon
            </a>
            <a href="#categories" className="rounded-full px-4 py-2 hover:bg-white/10 hover:text-white">
              Categories
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 rounded-full border border-zinc-800/80 bg-black/60 px-3 py-1.5">
            <span className="text-xs text-zinc-400">Search</span>
            <input
              placeholder="Teams, leagues, events"
              className="bg-transparent text-sm outline-none placeholder:text-zinc-500 w-44"
            />
          </div>
          <button className="hidden sm:inline-flex rounded-full border border-zinc-700/80 bg-black/60 px-4 py-2 text-sm font-semibold text-white hover:border-zinc-500">
            Plans
          </button>
          <button className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold shadow-lg shadow-white/10">
            Multi Stream
          </button>
        </div>
      </div>
    </header>
  );
}

function StreamCard({ s, now }: { s: StreamItem; now: number }) {
  const status = getStreamStatus(s, now);
  const startsAt = formatTime(s.starts_at);
  const progress =
    s.starts_at <= now && now <= s.ends_at
      ? Math.min(100, Math.max(0, ((now - s.starts_at) / (s.ends_at - s.starts_at)) * 100))
      : 0;
  const badgeClass =
    status.tone === "live"
      ? "bg-red-600 text-white"
      : status.tone === "upcoming"
        ? "bg-amber-500/90 text-black"
        : "bg-zinc-700 text-white";
  return (
    <Link href={`/live/${s.uri_name}`} className="group block">
      <div className="relative rounded-2xl overflow-hidden border border-zinc-800/70 bg-[#0b0b0b] shadow-lg transition-transform duration-200 group-hover:scale-[1.03]">
        <div className="relative aspect-video w-full">
          <Image src={s.poster} alt={s.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
          <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/30 to-black/80" />
          <div className="absolute top-3 left-3">
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${badgeClass}`}>{status.label}</span>
          </div>
          <div className="absolute top-3 right-3 rounded-full bg-black/70 px-3 py-1 text-[11px] text-white">
            {startsAt}
          </div>
          <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
            {status.tone === "live" && (
              <div className="h-1 w-full rounded-full bg-white/15">
                <div className="h-full rounded-full bg-red-500" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black">Watch</span>
              <span className="rounded-full border border-white/40 px-4 py-2 text-xs font-semibold text-white">Details</span>
            </div>
          </div>
        </div>
        <div className="p-4 text-white">
          <div className="font-semibold text-sm line-clamp-2 min-h-9">{s.name}</div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
            <span>{s.tag}</span>
            <span>•</span>
            <span>{status.countdown || `${s.viewers} viewers`}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function StreamRail({ title, streams, now, id }: { title: string; streams: StreamItem[]; now: number; id?: string }) {
  if (streams.length === 0) {
    return null;
  }

  return (
    <section id={id} className="mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="text-xs text-zinc-500">{streams.length} streams</span>
      </div>
      <div className="flex gap-5 overflow-x-auto pb-3">
        {streams.map((s) => (
          <div key={s.id} className="min-w-60 max-w-65">
            <StreamCard s={s} now={now} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomeClient({ initialData }: { initialData: HomeData }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => initialData.streams.map((c) => c.category), [initialData.streams]);

  const now = Math.floor(Date.now() / 1000);
  const allStreams = useMemo(
    () => initialData.streams.flatMap((c) => c.streams),
    [initialData.streams]
  );

  const liveStreams = useMemo(
    () => allStreams.filter((s) => s.starts_at <= now && now <= s.ends_at),
    [allStreams, now]
  );

  const upcomingStreams = useMemo(
    () => allStreams.filter((s) => s.starts_at > now).sort((a, b) => a.starts_at - b.starts_at),
    [allStreams, now]
  );

  const topPicks = useMemo(
    () => [...allStreams].sort((a, b) => parseViewers(b.viewers) - parseViewers(a.viewers)).slice(0, 12),
    [allStreams]
  );

  const trendingStreams = useMemo(
    () => [...upcomingStreams].slice(0, 12),
    [upcomingStreams]
  );

  const categoryRails = useMemo(
    () => initialData.streams.slice(0, 4),
    [initialData.streams]
  );

  const featuredStream = liveStreams[0] ?? upcomingStreams[0] ?? allStreams[0];

  const displayStreams = selectedCategory
    ? initialData.streams.find((c) => c.category === selectedCategory)?.streams ?? []
    : allStreams;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <Header />

      {featuredStream && (
        <section className="relative overflow-hidden border-b border-zinc-900">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-50"
            style={{ backgroundImage: `url(${featuredStream.poster})` }}
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/80 to-[#050505]" />
          <div className="relative w-full px-6 py-16">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-zinc-300">
                <span className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-red-400">
                  Featured
                </span>
                <span>{featuredStream.tag}</span>
                <span>•</span>
                <span>{formatTime(featuredStream.starts_at)}</span>
              </div>
              <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-tight">
                {featuredStream.name}
              </h1>
              <p className="mt-4 text-zinc-300 text-sm md:text-base">
                {getStreamStatus(featuredStream, now).countdown || "Catch the action live with premium coverage."}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-300">
                <span className="rounded-full border border-zinc-700/70 bg-black/40 px-3 py-1">{featuredStream.category_name || "Featured"}</span>
                <span className="rounded-full border border-zinc-700/70 bg-black/40 px-3 py-1">
                  {parseViewers(featuredStream.viewers)} watching
                </span>
                <span className="rounded-full border border-zinc-700/70 bg-black/40 px-3 py-1">Ultra HD</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/live/${featuredStream.uri_name}`}
                  className="rounded-full bg-white text-black px-6 py-3 text-sm font-semibold"
                >
                  Watch now
                </Link>
                <button className="rounded-full border border-zinc-700/70 bg-black/50 px-6 py-3 text-sm font-semibold text-white">
                  Add to watchlist
                </button>
              </div>
            </div>
            {trendingStreams.length > 0 && (
              <div className="mt-12 hidden lg:block">
                <div className="text-xs uppercase tracking-wide text-zinc-400 mb-3">Trending Next</div>
                <div className="grid grid-cols-3 gap-4 max-w-4xl">
                  {trendingStreams.slice(0, 3).map((s) => (
                    <Link key={s.id} href={`/live/${s.uri_name}`} className="group">
                      <div className="relative rounded-xl overflow-hidden border border-zinc-800/70">
                        <div className="relative aspect-video">
                          <Image src={s.poster} alt={s.name} fill className="object-cover" />
                          <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/40 to-black/80" />
                        </div>
                        <div className="p-3">
                          <div className="text-xs text-zinc-400">{formatCountdown(s.starts_at - now)}</div>
                          <div className="text-sm font-semibold line-clamp-1 mt-1">{s.name}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <main className="w-full px-6 py-10">
        <StreamRail id="live-now" title="Live now" streams={liveStreams} now={now} />
        <StreamRail title="Top picks for you" streams={topPicks} now={now} />
        <StreamRail id="starting-soon" title="Starting soon" streams={upcomingStreams.slice(0, 12)} now={now} />
        <StreamRail title="Trending today" streams={trendingStreams} now={now} />

        {categoryRails.map((category) => (
          <StreamRail
            key={category.category}
            title={`Popular in ${category.category}`}
            streams={category.streams.slice(0, 12)}
            now={now}
          />
        ))}

        <section id="categories" className="mb-8">
          <h3 className="text-sm font-semibold text-zinc-400 mb-4">Browse by category</h3>
          <div className="flex gap-3 overflow-x-auto pb-4">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                selectedCategory === null
                  ? "bg-white text-black"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              All Sports
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
                  selectedCategory === category
                    ? "bg-white text-black"
                    : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold">
              {selectedCategory ? `${selectedCategory}` : "All Sports"}
            </h2>
            <span className="text-xs text-zinc-500">{displayStreams.length} streams</span>
          </div>

          {displayStreams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayStreams.map((s) => <StreamCard key={s.id} s={s} now={now} />)}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-400">
                {selectedCategory ? `No ${selectedCategory} streams available.` : "No streams available."}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
