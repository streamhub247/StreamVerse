"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

type StreamSource = {
  label: string;
  src: string;
  kind?: "embed" | "m3u8";
};

type StreamPlayerProps = {
  sources: StreamSource[];
  initialIndex?: number;
};

function formatLabel(label: string) {
  return label.replace(/\s*•\s*/g, " ").replace(/\s+/g, " ").trim();
}

export default function StreamPlayer({ sources, initialIndex = 0 }: StreamPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const activeSource = sources[activeIndex] ?? sources[0];
  const activeKind = activeSource?.kind ?? "embed";

  if (!activeSource) {
    return null;
  }

  useEffect(() => {
    if (activeKind !== "m3u8") {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0);
    const handleDurationChange = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("durationchange", handleDurationChange);

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(activeSource.src);
      hls.attachMedia(video);
      return () => {
        hls.destroy();
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("durationchange", handleDurationChange);
      };
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = activeSource.src;
    }

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("durationchange", handleDurationChange);
    };
  }, [activeKind, activeSource.src]);

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [activeIndex]);

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      setIsFullscreen(false);
      return;
    }

    await container.requestFullscreen();
    setIsFullscreen(true);
  };

  const rewindSeconds = 15;
  const handleRewind = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const nextTime = Math.max(0, video.currentTime - rewindSeconds);
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleSeek = (value: number) => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const nextTime = Math.min(Math.max(0, value), duration || 0);
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div className="space-y-5">
      <div ref={containerRef} className="w-full overflow-hidden rounded-2xl bg-black">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          {activeKind === "m3u8" ? (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full"
              controls
              playsInline
              autoPlay
              muted
            />
          ) : (
            <iframe
              src={activeSource.src}
              className="absolute inset-0 h-full w-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-0.5 pointer-events-none">
            <img
              src="https://assets.football-logos.cc/logos/tournaments/1500x1500/fifa-world-cup-2026--white.10e0b37b.png"
              alt="Watermark"
              className={`${isFullscreen ? "h-28 w-28" : "h-10 w-10"} opacity-90`}
              loading="lazy"
            />
            <span
              className={`-mt+1 ${isFullscreen ? "text-sm" : "text-[11px]"}  text-white/80 bg-black/40 px-2 py-0.5 rounded`}
            >
              FIFA WC 26 soon.
            </span>
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-black/40 transition hover:bg-black/90"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
              {isFullscreen ? (
                <svg viewBox="0 0 20 20" className="h-5 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M7 4H4v3M13 4h3v3M7 16H4v-3M13 16h3v-3" />
                </svg>
              ) : (
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M4 7V4h3M16 7V4h-3M4 13v3h3M16 13v3h-3" />
                </svg>
              )}
            </span>
            {isFullscreen ? "" : ""}
          </button>
        </div>
        {activeKind === "m3u8" ? (
          <div className="flex flex-col gap-3 border-t border-white/10 bg-black/70 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRewind}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
              >
                ↺ {rewindSeconds}s
              </button>
              <div className="text-xs text-white/60">Drag to seek</div>
            </div>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => handleSeek(Number(event.target.value))}
              className="w-full accent-red-500"
            />
          </div>
        ) : (
          <div className="border-t border-white/10 bg-black/70 px-4 py-3 text-xs text-white/60">
            Rewind and seek are available for M3U8 sources only.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-white/60">Available sources</div>
          <span className="text-xs text-white/50">{sources.length} total streams</span>
        </div>

        <div className="mt-4 space-y-2">
          {sources.map((source, index) => {
            const isActive = index === activeIndex;
            const formatted = formatLabel(source.label);
            const isHd = formatted.toLowerCase().includes("hd");
            return (
              <button
                key={`${source.label}-${source.src}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={
                  isActive
                    ? "flex w-full items-center justify-between rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-3 text-left text-sm text-white"
                    : "flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm text-white/90 hover:border-white/30"
                }
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/70">
                    #{index + 1}
                  </span>
                  {isHd && (
                    <span className="rounded-full bg-red-600/30 px-2 py-0.5 text-[10px] font-semibold text-red-200">
                      HD
                    </span>
                  )}
                  <span className="text-sm font-medium">{formatted}</span>
                </div>
                <span className="text-xs text-white/50">Select</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
