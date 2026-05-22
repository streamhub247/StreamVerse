import AdminClient from "./admin-client";

const STREAMS_API = "https://api.ppv.to/api/streams";

type StreamItem = {
  id: number;
  name: string;
  uri_name: string;
};

type CategoryGroup = {
  category: string;
  streams: StreamItem[];
};

type StreamsResponse = {
  streams: CategoryGroup[];
};

export default async function AdminPage() {
  const res = await fetch(STREAMS_API, { cache: "no-store" });

  if (!res.ok) {
    return (
      <div className="min-h-screen bg-[#050505] text-white px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-8">
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="mt-3 text-sm text-zinc-400">Unable to load streams right now.</p>
        </div>
      </div>
    );
  }

  const data = (await res.json()) as StreamsResponse;
  const streams = data.streams.flatMap((category) =>
    category.streams.map((stream) => ({
      id: stream.id,
      name: stream.name,
      uri_name: stream.uri_name,
    }))
  );

  return <AdminClient streams={streams} />;
}
