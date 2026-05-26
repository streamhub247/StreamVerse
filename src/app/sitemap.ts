import type { MetadataRoute } from "next";
import { getDatabase } from "@/lib/mongodb";
import { buildAbsoluteUrl } from "@/lib/seo";

type StreamItem = {
  uri_name: string;
  starts_at?: number;
  substreams?: StreamItem[];
};

type StreamsResponse = {
  streams: Array<{
    streams: StreamItem[];
  }>;
};

type ManualStream = {
  uri_name: string;
  starts_at?: number;
};

export const revalidate = 1800;

function normalizeStreams(data: StreamsResponse) {
  return data.streams.flatMap((category) =>
    category.streams.flatMap((stream) => {
      const substreams = (stream.substreams ?? []).map((sub) => ({
        ...sub,
        uri_name: sub.uri_name,
        starts_at: sub.starts_at ?? stream.starts_at,
      }));

      return [stream, ...substreams];
    })
  );
}

function buildLiveUrl(uriName: string) {
  const encoded = uriName
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return buildAbsoluteUrl(`/live/${encoded}`);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: buildAbsoluteUrl("/"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: buildAbsoluteUrl("/fifa-worldcup-2026"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  const dynamicEntries: MetadataRoute.Sitemap = [];
  const seen = new Set<string>();

  try {
    const res = await fetch("https://api.ppv.to/api/streams", { next: { revalidate: 900 } });
    if (res.ok) {
      const data = (await res.json()) as StreamsResponse;
      const all = normalizeStreams(data);

      for (const stream of all) {
        if (!stream.uri_name || seen.has(stream.uri_name)) {
          continue;
        }

        seen.add(stream.uri_name);
        dynamicEntries.push({
          url: buildLiveUrl(stream.uri_name),
          lastModified: stream.starts_at ? new Date(stream.starts_at * 1000) : now,
          changeFrequency: "hourly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Ignore external API failures for sitemap generation.
  }

  try {
    const db = await getDatabase();
    const manualStreams = await db
      .collection<ManualStream>("admin_manual_streams")
      .find({}, { projection: { uri_name: 1, starts_at: 1 } })
      .toArray();

    for (const stream of manualStreams) {
      if (!stream.uri_name || seen.has(stream.uri_name)) {
        continue;
      }

      seen.add(stream.uri_name);
      dynamicEntries.push({
        url: buildLiveUrl(stream.uri_name),
        lastModified: stream.starts_at ? new Date(stream.starts_at * 1000) : now,
        changeFrequency: "hourly",
        priority: 0.8,
      });
    }
  } catch {
    // Ignore database failures for sitemap generation.
  }

  return [...staticEntries, ...dynamicEntries];
}
