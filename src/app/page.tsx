import HomeClient from "../components/home-client";

const STREAMS_API = "https://api.ppv.to/api/streams";

export const revalidate = 30;

export default async function Home() {
  const res = await fetch(STREAMS_API, { next: { revalidate: 30 } });

  if (!res.ok) {
    throw new Error(`Failed to load streams: ${res.status}`);
  }

  const data = await res.json();

  return <HomeClient initialData={data} />;
}
