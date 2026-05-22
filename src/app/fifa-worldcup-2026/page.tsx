import Image from "next/image";
import Link from "next/link";

type WorldCupHighlight = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  badge?: string;
};

type WorldCupMatch = {
  id: string;
  title: string;
  stage: string;
  date: string;
  venue: string;
  image: string;
  status: string;
};

const WORLD_CUP_HIGHLIGHTS: WorldCupHighlight[] = [
  {
    id: "wc26-hero",
    title: "World Cup 26 Hub",
    subtitle: "Three nations. One summer. Every moment in 4K glory.",
    image: "/worldcup/hero.svg",
    badge: "Summer 2026",
  },
  {
    id: "wc26-cities",
    title: "Host cities",
    subtitle: "North America lights up with world-class stadiums.",
    image: "/worldcup/host-cities.svg",
    badge: "16 Cities",
  },
  {
    id: "wc26-fans",
    title: "Fan zones",
    subtitle: "Public watch parties, highlights, and behind-the-scenes.",
    image: "/worldcup/fan-zone.svg",
    badge: "Live vibes",
  },
];

const WORLD_CUP_MATCHES: WorldCupMatch[] = [
  {
    id: "wc26-match-1",
    title: "Matchday 1 • Opening Showcase",
    stage: "Group Stage",
    date: "TBA, June 2026",
    venue: "MetLife Stadium, NJ",
    image: "/worldcup/match-1.svg",
    status: "Streaming links coming soon",
  },
  {
    id: "wc26-match-2",
    title: "Matchday 7 • Rivalry Night",
    stage: "Group Stage",
    date: "TBA, June 2026",
    venue: "SoFi Stadium, CA",
    image: "/worldcup/match-2.svg",
    status: "Streaming links coming soon",
  },
  {
    id: "wc26-match-3",
    title: "Knockout Spotlight",
    stage: "Round of 16",
    date: "TBA, July 2026",
    venue: "AT&T Stadium, TX",
    image: "/worldcup/match-3.svg",
    status: "Streaming links coming soon",
  },
];

export default function WorldCupPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
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
              <Link
                href="/fifa-worldcup-2026"
                className="rounded-full px-4 py-2 bg-white/10 text-white"
              >
                World Cup 26
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button className="hidden sm:inline-flex rounded-full border border-zinc-700/80 bg-black/60 px-4 py-2 text-sm font-semibold text-white hover:border-zinc-500">
              Plans
            </button>
            <button className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold shadow-lg shadow-white/10">
              Multi Stream
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-12">
        <section className="mb-14">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-red-400">World Cup 26</div>
              <h1 className="text-2xl md:text-3xl font-semibold mt-2">Special Coverage Center</h1>
              <p className="text-sm text-zinc-400 mt-2 max-w-2xl">
                All match streams will be added as soon as broadcasters confirm their links. Until then,
                explore the highlights, cities, and upcoming matchdays.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-red-300">
                Streaming links soon
              </span>
              <span className="rounded-full border border-zinc-700/70 bg-zinc-900/60 px-3 py-1">
                June–July 2026
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {WORLD_CUP_HIGHLIGHTS.map((item) => (
              <div key={item.id} className="rounded-2xl overflow-hidden border border-zinc-800/70 bg-zinc-950/70">
                <div className="relative aspect-video">
                  <Image src={item.image} alt={item.title} fill className="object-cover" />
                  <div className="absolute inset-0 bg-linear-to-b from-black/10 via-black/50 to-black/90" />
                  {item.badge && (
                    <div className="absolute top-3 left-3 rounded-full bg-red-600/90 px-3 py-1 text-[11px] font-semibold text-white">
                      {item.badge}
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-zinc-400 mt-2">{item.subtitle}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Featured matchdays</h2>
              <span className="text-xs text-zinc-500">Links will appear here first</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {WORLD_CUP_MATCHES.map((match) => (
                <div key={match.id} className="rounded-2xl border border-zinc-800/70 bg-[#0b0b0b] overflow-hidden">
                  <div className="relative aspect-video">
                    <Image src={match.image} alt={match.title} fill className="object-cover" />
                    <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/50 to-black/90" />
                    <span className="absolute top-3 left-3 rounded-full bg-amber-400/90 px-3 py-1 text-[11px] font-semibold text-black">
                      {match.stage}
                    </span>
                  </div>
                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold">{match.title}</h3>
                      <p className="text-xs text-zinc-400 mt-1">{match.date}</p>
                      <p className="text-xs text-zinc-500">{match.venue}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400">{match.status}</span>
                      <button
                        className="rounded-full border border-zinc-700/70 bg-zinc-900/40 px-3 py-1.5 text-[11px] font-semibold text-zinc-400"
                        disabled
                      >
                        Notify me
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
