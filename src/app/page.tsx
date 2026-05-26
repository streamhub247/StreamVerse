import type { Metadata } from "next";
import HomeClient, { type HomeData, type StreamItem } from "../components/home-client";
import { getDatabase } from "@/lib/mongodb";
import { buildAbsoluteUrl, SITE_DESCRIPTION, SITE_NAME, toAbsoluteImageUrl, parseTeamsFromName } from "@/lib/seo";

const STREAMS_API = "https://api.ppv.to/api/streams";

type PageStreamItem = StreamItem & {
  source_tag?: string;
  description?: string;
  iframe?: string;
  is_manual?: boolean;
  category_name?: string;
};

type StreamCategory = {
  category: string;
  streams: PageStreamItem[];
};

export const revalidate = 30;

export const metadata: Metadata = {
  title: "Live Sports Streams",
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${SITE_NAME} • Live Sports Streams`,
    description: SITE_DESCRIPTION,
    url: buildAbsoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} • Live Sports Streams`,
    description: SITE_DESCRIPTION,
  },
};

export default async function Home() {
  const res = await fetch(STREAMS_API, { next: { revalidate: 30 } });

  if (!res.ok) {
    throw new Error(`Failed to load streams: ${res.status}`);
  }

  const data = (await res.json()) as {
    streams: StreamCategory[];
    [key: string]: unknown;
  };

  const db = await getDatabase();
  const manualCollection = db.collection<{
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
  }>("admin_manual_streams");

  const manualStreams = await manualCollection.find().toArray();

  const categoryMap = new Map<string, PageStreamItem[]>();
  for (const category of data.streams) {
    categoryMap.set(category.category, [...category.streams]);
  }

  for (const stream of manualStreams) {
    const category = stream.category_name || "Manual";
    const list = categoryMap.get(category) ?? [];
    list.push({
      id: stream.id,
      name: stream.name,
      tag: stream.tag ?? "",
      source_tag: stream.tag,
      poster: stream.poster,
      uri_name: stream.uri_name,
      starts_at: stream.starts_at,
      ends_at: stream.ends_at,
      always_live: stream.always_live ? 1 : 0,
      category_name: stream.category_name || category,
      iframe: stream.stream_url,
      viewers: stream.viewers ?? "0",
      description: stream.description,
      is_manual: true,
    });
    categoryMap.set(category, list);
  }

  const merged: HomeData = {
    ...data,
    streams: Array.from(categoryMap.entries()).map(([category, streams]) => ({
      category,
      streams,
    })),
  };

  // Build structured data for visible streams (first 50)
  const flattened = merged.streams.flatMap((c) => (c.streams ?? []) as PageStreamItem[]);
  const events: Array<Record<string, unknown>> = flattened.slice(0, 50).map((s) => {
    const teams = parseTeamsFromName(s.name);
    return {
      "@type": "SportsEvent",
      name: s.name,
      url: buildAbsoluteUrl(`/live/${encodeURIComponent(s.uri_name)}`),
      startDate: s.starts_at ? new Date(s.starts_at * 1000).toISOString() : undefined,
      image: toAbsoluteImageUrl(s.poster) ?? undefined,
      location: s.tag ? { "@type": "Place", name: s.tag } : undefined,
      performer: teams
        ? [
            { "@type": "SportsTeam", name: teams.home },
            { "@type": "SportsTeam", name: teams.away },
          ]
        : undefined,
      description: s.description ?? undefined,
    } as Record<string, unknown>;
  });

  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: events.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: e,
    })),
  };

  const serverNow = Math.floor(Date.now() / 1000);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <HomeClient initialData={merged} serverNow={serverNow} />
    </>
  );
}
