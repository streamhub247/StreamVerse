import HomeClient from "../components/home-client";
import { getDatabase } from "@/lib/mongodb";

const STREAMS_API = "https://api.ppv.to/api/streams";

export const revalidate = 30;

export default async function Home() {
  const res = await fetch(STREAMS_API, { next: { revalidate: 30 } });

  if (!res.ok) {
    throw new Error(`Failed to load streams: ${res.status}`);
  }

  const data = await res.json();

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

  const categoryMap = new Map<string, typeof data.streams[0]["streams"]>();
  for (const category of data.streams) {
    categoryMap.set(category.category, [...category.streams]);
  }

  for (const stream of manualStreams) {
    const category = stream.category_name || "Manual";
    const list = categoryMap.get(category) ?? [];
    list.push({
      id: stream.id,
      name: stream.name,
      tag: stream.tag,
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

  const merged = {
    ...data,
    streams: Array.from(categoryMap.entries()).map(([category, streams]) => ({
      category,
      streams,
    })),
  };

  return <HomeClient initialData={merged} />;
}
