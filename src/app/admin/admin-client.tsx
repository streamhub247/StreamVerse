"use client";

import { useEffect, useMemo, useState } from "react";

type StreamItem = {
  id: number | string;
  name: string;
  uri_name: string;
  is_manual?: boolean;
};

type ManualStream = {
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
  stream_kind: "embed" | "m3u8";
};

type StreamSource = {
  key: string;
  label: string;
  url: string;
  kind: "embed" | "m3u8";
  origin: "admin" | "ppv" | "streamed";
  createdAt?: string;
  rank?: number;
  hidden?: boolean;
};

type AdminClientProps = {
  streams: StreamItem[];
};

const SOURCE_KIND_OPTIONS: Array<{ label: string; value: "embed" | "m3u8" }> = [
  { label: "Embed link", value: "embed" },
  { label: "M3U8 link", value: "m3u8" },
];

function toLocalDatetimeInput(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalDatetimeInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return Math.floor(date.getTime() / 1000);
}

export default function AdminClient({ streams }: AdminClientProps) {
  const [streamOptions, setStreamOptions] = useState<StreamItem[]>(streams);
  const [selectedStream, setSelectedStream] = useState<StreamItem | null>(streams[0] ?? null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeEnabled, setNoticeEnabled] = useState(false);
  const [noticeTone, setNoticeTone] = useState<"info" | "warning" | "success" | "danger">("warning");
  const [noticeSize, setNoticeSize] = useState<"sm" | "md" | "lg">("md");
  const [noticeBackgroundColor, setNoticeBackgroundColor] = useState("");
  const [noticeTextColor, setNoticeTextColor] = useState("");
  const [noticeImageUrl, setNoticeImageUrl] = useState("");
  const [noticeCtaText, setNoticeCtaText] = useState("");
  const [noticeCtaUrl, setNoticeCtaUrl] = useState("");
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeLoaded, setNoticeLoaded] = useState(false);
  const [overlayTitle, setOverlayTitle] = useState("");
  const [overlayMessage, setOverlayMessage] = useState("");
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [overlaySize, setOverlaySize] = useState<"sm" | "md" | "lg">("md");
  const [overlayBackgroundColor, setOverlayBackgroundColor] = useState("");
  const [overlayTextColor, setOverlayTextColor] = useState("");
  const [overlayImageUrl, setOverlayImageUrl] = useState("");
  const [overlayCtaText, setOverlayCtaText] = useState("");
  const [overlayCtaUrl, setOverlayCtaUrl] = useState("");
  const [overlaySaving, setOverlaySaving] = useState(false);
  const [overlayLoaded, setOverlayLoaded] = useState(false);
  const [overlayTarget, setOverlayTarget] = useState<"all" | "home" | "admin" | "custom">("all");
  const [overlayCustomPaths, setOverlayCustomPaths] = useState("");
  const [overlayImageSize, setOverlayImageSize] = useState<"sm" | "md" | "lg">("md");
  const [overlayImageSizePercent, setOverlayImageSizePercent] = useState<number | "">("");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<"embed" | "m3u8">("embed");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editKind, setEditKind] = useState<"embed" | "m3u8">("embed");
  const [editHidden, setEditHidden] = useState(false);
  const [manualStreams, setManualStreams] = useState<ManualStream[]>([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [editingManualId, setEditingManualId] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualSlug, setManualSlug] = useState("");
  const [manualTag, setManualTag] = useState("");
  const [manualCategory, setManualCategory] = useState("");
  const [manualPoster, setManualPoster] = useState("");
  const [manualStreamUrl, setManualStreamUrl] = useState("");
  const [manualStreamKind, setManualStreamKind] = useState<"embed" | "m3u8">("embed");
  const [manualStartsAt, setManualStartsAt] = useState(() => toLocalDatetimeInput(new Date()));
  const [manualEndsAt, setManualEndsAt] = useState(() =>
    toLocalDatetimeInput(new Date(Date.now() + 2 * 60 * 60 * 1000))
  );
  const [manualAlwaysLive, setManualAlwaysLive] = useState(false);
  const [manualViewers, setManualViewers] = useState("");
  const [manualDescription, setManualDescription] = useState("");

  const orderedStreams = useMemo(
    () => [...streamOptions].sort((a, b) => a.name.localeCompare(b.name)),
    [streamOptions]
  );

  const loadSources = async (uriName: string) => {
    setLoadingSources(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sources?uri_name=${encodeURIComponent(uriName)}`);
      if (!res.ok) {
        const payload = (await res.json()) as { message?: string };
        throw new Error(payload.message ?? "Failed to load sources");
      }
      const data = (await res.json()) as { sources: StreamSource[] };
      setSources(data.sources);
    } catch (err) {
      setSources([]);
      setError(err instanceof Error ? err.message : "Failed to load sources");
    } finally {
      setLoadingSources(false);
    }
  };

  const mergeManualStreams = (items: ManualStream[]) => {
    const manualItems: StreamItem[] = items.map((stream) => ({
      id: stream.id,
      name: stream.name,
      uri_name: stream.uri_name,
      is_manual: true,
    }));

    setStreamOptions((previous) => {
      const nonManual = previous.filter((item) => !item.is_manual);
      return [...manualItems, ...nonManual];
    });
  };

  const loadManualStreams = async () => {
    setManualLoading(true);
    setManualError(null);
    try {
      const res = await fetch("/api/admin/manual-streams");
      if (!res.ok) {
        const payload = (await res.json()) as { message?: string };
        throw new Error(payload.message ?? "Failed to load manual streams");
      }
      const data = (await res.json()) as { streams: ManualStream[] };
      setManualStreams(data.streams);
      mergeManualStreams(data.streams);
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Failed to load manual streams");
    } finally {
      setManualLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStream) {
      void loadSources(selectedStream.uri_name);
    }
  }, [selectedStream]);

  useEffect(() => {
    setStreamOptions(streams);
    if (!selectedStream && streams[0]) {
      setSelectedStream(streams[0]);
    }
  }, [streams, selectedStream]);

  useEffect(() => {
    void loadManualStreams();
  }, []);

  useEffect(() => {
    if (noticeLoaded) {
      return;
    }

    const loadNotice = async () => {
      try {
        const res = await fetch("/api/admin/notice");
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as {
          title?: string;
          message?: string;
          enabled?: boolean;
          tone?: "info" | "warning" | "success" | "danger";
          size?: "sm" | "md" | "lg";
          backgroundColor?: string;
          textColor?: string;
          imageUrl?: string;
          ctaText?: string;
          ctaUrl?: string;
        };
        setNoticeTitle(data.title ?? "");
        setNoticeMessage(data.message ?? "");
        setNoticeEnabled(Boolean(data.enabled));
        if (data.tone) {
          setNoticeTone(data.tone);
        }
        if (data.size) {
          setNoticeSize(data.size);
        }
        setNoticeBackgroundColor(data.backgroundColor ?? "");
        setNoticeTextColor(data.textColor ?? "");
        setNoticeImageUrl(data.imageUrl ?? "");
        setNoticeCtaText(data.ctaText ?? "");
        setNoticeCtaUrl(data.ctaUrl ?? "");
      } finally {
        setNoticeLoaded(true);
      }
    };

    void loadNotice();
  }, [noticeLoaded]);

  useEffect(() => {
    if (overlayLoaded) {
      return;
    }

    const loadOverlay = async () => {
      try {
        const res = await fetch("/api/admin/overlay-alert");
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as {
          title?: string;
          message?: string;
          enabled?: boolean;
          size?: "sm" | "md" | "lg";
          backgroundColor?: string;
          textColor?: string;
          imageUrl?: string;
          ctaText?: string;
          ctaUrl?: string;
          target?: "all" | "home" | "admin" | "custom";
          customPaths?: string[];
          imageSize?: "sm" | "md" | "lg";
          imageSizePercent?: number | null;
        };
        setOverlayTitle(data.title ?? "");
        setOverlayMessage(data.message ?? "");
        setOverlayEnabled(Boolean(data.enabled));
        if (data.size) {
          setOverlaySize(data.size);
        }
        setOverlayBackgroundColor(data.backgroundColor ?? "");
        setOverlayTextColor(data.textColor ?? "");
        setOverlayImageUrl(data.imageUrl ?? "");
        setOverlayCtaText(data.ctaText ?? "");
        setOverlayCtaUrl(data.ctaUrl ?? "");
        setOverlayTarget(data.target ?? "all");
        setOverlayCustomPaths((data.customPaths ?? []).join("\n"));
        setOverlayImageSize(data.imageSize ?? "md");
        setOverlayImageSizePercent(data.imageSizePercent ?? "");
      } finally {
        setOverlayLoaded(true);
      }
    };

    void loadOverlay();
  }, [overlayLoaded]);

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStream) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/streams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri_name: selectedStream.uri_name,
          label: label.trim() || undefined,
          url,
          kind,
        }),
      });

      if (!res.ok) {
        const payload = (await res.json()) as { message?: string };
        throw new Error(payload.message ?? "Failed to add source");
      }

      await loadSources(selectedStream.uri_name);
      setLabel("");
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add source");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (sourceId: string) => {
    if (!selectedStream) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/streams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri_name: selectedStream.uri_name, sourceId }),
      });

      if (!res.ok) {
        const payload = (await res.json()) as { message?: string };
        throw new Error(payload.message ?? "Failed to remove source");
      }

      await loadSources(selectedStream.uri_name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove source");
    } finally {
      setSaving(false);
    }
  };

  const moveSource = async (index: number, direction: number) => {
    if (!selectedStream) {
      return;
    }
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= sources.length) {
      return;
    }
    const next = [...sources];
    const temp = next[index];
    next[index] = next[nextIndex];
    next[nextIndex] = temp;
    setSources(next);
    setSaving(true);
    try {
      await fetch("/api/admin/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri_name: selectedStream.uri_name,
          order: next.map((item) => item.key),
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (source: StreamSource) => {
    setEditingKey(source.key);
    setEditLabel(source.label);
    setEditUrl(source.url);
    setEditKind(source.kind);
    setEditHidden(Boolean(source.hidden));
  };

  const handleSaveEdit = async () => {
    if (!selectedStream || !editingKey) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uri_name: selectedStream.uri_name,
          key: editingKey,
          label: editLabel,
          url: editUrl,
          kind: editKind,
          hidden: editHidden,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { message?: string };
        throw new Error(payload.message ?? "Failed to update source");
      }
      await loadSources(selectedStream.uri_name);
      setEditingKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update source");
    } finally {
      setSaving(false);
    }
  };

  const handleNoticeSave = async () => {
    setNoticeSaving(true);
    try {
      await fetch("/api/admin/notice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noticeTitle,
          message: noticeMessage,
          enabled: noticeEnabled,
          tone: noticeTone,
          size: noticeSize,
          backgroundColor: noticeBackgroundColor,
          textColor: noticeTextColor,
          imageUrl: noticeImageUrl,
          ctaText: noticeCtaText,
          ctaUrl: noticeCtaUrl,
        }),
      });
    } finally {
      setNoticeSaving(false);
    }
  };

  const handleOverlaySave = async () => {
    setOverlaySaving(true);
    try {
      await fetch("/api/admin/overlay-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: overlayTitle,
          message: overlayMessage,
          enabled: overlayEnabled,
          size: overlaySize,
          backgroundColor: overlayBackgroundColor,
          textColor: overlayTextColor,
          imageUrl: overlayImageUrl,
          ctaText: overlayCtaText,
          ctaUrl: overlayCtaUrl,
          target: overlayTarget,
          customPaths: overlayCustomPaths.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
          imageSizePercent: typeof overlayImageSizePercent === "number" ? overlayImageSizePercent : undefined,
        }),
      });
    } finally {
      setOverlaySaving(false);
    }
  };

  const resetManualForm = () => {
    setEditingManualId(null);
    setManualName("");
    setManualSlug("");
    setManualTag("");
    setManualCategory("");
    setManualPoster("");
    setManualStreamUrl("");
    setManualStreamKind("embed");
    setManualStartsAt(toLocalDatetimeInput(new Date()));
    setManualEndsAt(toLocalDatetimeInput(new Date(Date.now() + 2 * 60 * 60 * 1000)));
    setManualAlwaysLive(false);
    setManualViewers("");
    setManualDescription("");
  };

  const startEditManual = (stream: ManualStream) => {
    setEditingManualId(stream.id);
    setManualName(stream.name);
    setManualSlug(stream.uri_name);
    setManualTag(stream.tag);
    setManualCategory(stream.category_name ?? "");
    setManualPoster(stream.poster);
    setManualStreamUrl(stream.stream_url);
    setManualStreamKind(stream.stream_kind);
    setManualStartsAt(toLocalDatetimeInput(new Date(stream.starts_at * 1000)));
    setManualEndsAt(toLocalDatetimeInput(new Date(stream.ends_at * 1000)));
    setManualAlwaysLive(Boolean(stream.always_live));
    setManualViewers(stream.viewers ? String(stream.viewers) : "");
    setManualDescription(stream.description ?? "");
  };

  const handleManualSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setManualSaving(true);
    setManualError(null);

    const startsAt = fromLocalDatetimeInput(manualStartsAt);
    const endsAt = fromLocalDatetimeInput(manualEndsAt);

    if (startsAt === null || endsAt === null) {
      setManualError("Please provide valid start and end times.");
      setManualSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/manual-streams", {
        method: editingManualId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingManualId ?? undefined,
          name: manualName.trim(),
          uri_name: manualSlug.trim() || undefined,
          tag: manualTag.trim(),
          category_name: manualCategory.trim() || undefined,
          poster: manualPoster.trim(),
          stream_url: manualStreamUrl.trim(),
          stream_kind: manualStreamKind,
          starts_at: startsAt,
          ends_at: endsAt,
          always_live: manualAlwaysLive,
          viewers: manualViewers.trim() || undefined,
          description: manualDescription.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const payload = (await res.json()) as { message?: string };
        throw new Error(payload.message ?? "Failed to save manual stream");
      }

      await loadManualStreams();
      resetManualForm();
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Failed to save manual stream");
    } finally {
      setManualSaving(false);
    }
  };

  const handleManualDelete = async (streamId: string) => {
    setManualSaving(true);
    setManualError(null);
    try {
      const res = await fetch("/api/admin/manual-streams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: streamId }),
      });
      if (!res.ok) {
        const payload = (await res.json()) as { message?: string };
        throw new Error(payload.message ?? "Failed to delete manual stream");
      }
      await loadManualStreams();
      if (editingManualId === streamId) {
        resetManualForm();
      }
    } catch (err) {
      setManualError(err instanceof Error ? err.message : "Failed to delete manual stream");
    } finally {
      setManualSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="w-full border-b border-zinc-900/80 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-emerald-400">Admin</div>
            <h1 className="text-2xl font-semibold">Stream Source Manager</h1>
          </div>
          <div className="text-xs text-zinc-400">Update streams on the fly</div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Site notice</h2>
              <p className="text-sm text-zinc-400">Show a banner message at the top of the site.</p>
            </div>
            <button
              type="button"
              onClick={handleNoticeSave}
              disabled={noticeSaving}
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {noticeSaving ? "Saving..." : "Save notice"}
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <textarea
              value={noticeMessage}
              onChange={(event) => setNoticeMessage(event.target.value)}
              placeholder="Enter notice message..."
              className="min-h-24 w-full rounded-2xl border border-zinc-800/80 bg-black/60 px-4 py-3 text-sm text-white"
            />
            <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={noticeEnabled}
                onChange={(event) => setNoticeEnabled(event.target.checked)}
              />
              Show notice
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Alert title (optional)</label>
              <input
                value={noticeTitle}
                onChange={(event) => setNoticeTitle(event.target.value)}
                placeholder="Important update"
                className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Alert size</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { label: "Small", value: "sm" },
                  { label: "Medium", value: "md" },
                  { label: "Large", value: "lg" },
                ] as const).map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${
                      noticeSize === option.value
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                        : "border-zinc-800/80 bg-black/60 text-zinc-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="notice-size"
                      value={option.value}
                      checked={noticeSize === option.value}
                      onChange={() => setNoticeSize(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Background color (hex)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={noticeBackgroundColor || "#f59e0b"}
                  onChange={(event) => setNoticeBackgroundColor(event.target.value)}
                  className="h-10 w-12 rounded border border-zinc-800/80 bg-black/70"
                />
                <input
                  value={noticeBackgroundColor}
                  onChange={(event) => setNoticeBackgroundColor(event.target.value)}
                  placeholder="#f59e0b"
                  className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Text color (hex)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={noticeTextColor || "#0b0b0b"}
                  onChange={(event) => setNoticeTextColor(event.target.value)}
                  className="h-10 w-12 rounded border border-zinc-800/80 bg-black/70"
                />
                <input
                  value={noticeTextColor}
                  onChange={(event) => setNoticeTextColor(event.target.value)}
                  placeholder="#0b0b0b"
                  className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Alert image URL (optional)</label>
              <input
                value={noticeImageUrl}
                onChange={(event) => setNoticeImageUrl(event.target.value)}
                placeholder="https://..."
                className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">CTA text (optional)</label>
              <input
                value={noticeCtaText}
                onChange={(event) => setNoticeCtaText(event.target.value)}
                placeholder="View update"
                className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">CTA URL (optional)</label>
            <input
              value={noticeCtaUrl}
              onChange={(event) => setNoticeCtaUrl(event.target.value)}
              placeholder="https://..."
              className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {([
              { label: "Info", value: "info", className: "border-sky-500/40 bg-sky-500/10 text-sky-200" },
              { label: "Warning", value: "warning", className: "border-amber-500/40 bg-amber-500/10 text-amber-200" },
              { label: "Success", value: "success", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" },
              { label: "Danger", value: "danger", className: "border-red-500/40 bg-red-500/10 text-red-200" },
            ] as const).map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${
                  noticeTone === option.value ? option.className : "border-zinc-800/80 bg-black/60 text-zinc-300"
                }`}
              >
                <input
                  type="radio"
                  name="notice-tone"
                  value={option.value}
                  checked={noticeTone === option.value}
                  onChange={() => setNoticeTone(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Overlay alert</h2>
              <p className="text-sm text-zinc-400">
                Display a full-page alert overlay above the entire site and streams.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOverlaySave}
              disabled={overlaySaving}
              className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {overlaySaving ? "Saving..." : "Save overlay"}
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <textarea
              value={overlayMessage}
              onChange={(event) => setOverlayMessage(event.target.value)}
              placeholder="Enter overlay message..."
              className="min-h-24 w-full rounded-2xl border border-zinc-800/80 bg-black/60 px-4 py-3 text-sm text-white"
            />
            <label className="inline-flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={overlayEnabled}
                onChange={(event) => setOverlayEnabled(event.target.checked)}
              />
              Show overlay
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Show on</label>
              <div className="flex flex-col gap-2">
                {([
                  { label: "All pages", value: "all" },
                  { label: "Home only", value: "home" },
                  { label: "Admin only", value: "admin" },
                  { label: "Custom paths", value: "custom" },
                ] as const).map((opt) => (
                  <label key={opt.value} className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="overlay-target"
                      value={opt.value}
                      checked={overlayTarget === opt.value}
                      onChange={() => setOverlayTarget(opt.value)}
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Image size</label>
              <div className="flex gap-2">
                {([
                  { label: "Small", value: "sm" },
                  { label: "Medium", value: "md" },
                  { label: "Large", value: "lg" },
                ] as const).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${
                      overlayImageSize === opt.value
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                        : "border-zinc-800/80 bg-black/60 text-zinc-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="overlay-image-size"
                      value={opt.value}
                      checked={overlayImageSize === opt.value}
                      onChange={() => setOverlayImageSize(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          {overlayTarget === "custom" && (
            <div className="mt-4">
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Custom paths (one per line)</label>
              <textarea
                value={overlayCustomPaths}
                onChange={(e) => setOverlayCustomPaths(e.target.value)}
                placeholder="/special-event\n/live/some-stream"
                className="min-h-20 w-full rounded-2xl border border-zinc-800/80 bg-black/60 px-4 py-3 text-sm text-white"
              />
            </div>
          )}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Overlay title (optional)</label>
              <input
                value={overlayTitle}
                onChange={(event) => setOverlayTitle(event.target.value)}
                placeholder="Emergency update"
                className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Overlay size</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { label: "Small", value: "sm" },
                  { label: "Medium", value: "md" },
                  { label: "Large", value: "lg" },
                ] as const).map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${
                      overlaySize === option.value
                        ? "border-red-500/60 bg-red-500/10 text-red-200"
                        : "border-zinc-800/80 bg-black/60 text-zinc-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="overlay-size"
                      value={option.value}
                      checked={overlaySize === option.value}
                      onChange={() => setOverlaySize(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Background color (hex)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={overlayBackgroundColor || "#111827"}
                  onChange={(event) => setOverlayBackgroundColor(event.target.value)}
                  className="h-10 w-12 rounded border border-zinc-800/80 bg-black/70"
                />
                <input
                  value={overlayBackgroundColor}
                  onChange={(event) => setOverlayBackgroundColor(event.target.value)}
                  placeholder="#111827"
                  className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Text color (hex)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={overlayTextColor || "#f9fafb"}
                  onChange={(event) => setOverlayTextColor(event.target.value)}
                  className="h-10 w-12 rounded border border-zinc-800/80 bg-black/70"
                />
                <input
                  value={overlayTextColor}
                  onChange={(event) => setOverlayTextColor(event.target.value)}
                  placeholder="#f9fafb"
                  className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Image size (%)</label>
              <input
                type="number"
                min={1}
                max={2000}
                value={overlayImageSizePercent as any}
                onChange={(e) => setOverlayImageSizePercent(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="100"
                className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
              />
              <p className="mt-2 text-xs text-zinc-500">Enter percentage to scale the image (e.g. 100 = base size, 500 = 5x).</p>
            </div>
            <div />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Overlay image URL (optional)</label>
              <input
                value={overlayImageUrl}
                onChange={(event) => setOverlayImageUrl(event.target.value)}
                placeholder="https://..."
                className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">CTA text (optional)</label>
              <input
                value={overlayCtaText}
                onChange={(event) => setOverlayCtaText(event.target.value)}
                placeholder="Read more"
                className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">CTA URL (optional)</label>
            <input
              value={overlayCtaUrl}
              onChange={(event) => setOverlayCtaUrl(event.target.value)}
              placeholder="https://..."
              className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
            />
          </div>
        </section>
        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Select a stream</h2>
              <p className="text-sm text-zinc-400">Pick the match to manage extra sources.</p>
            </div>
            <div className="w-full md:w-96">
              <select
                value={selectedStream?.uri_name ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  const next = streams.find((stream) => stream.uri_name === value) ?? null;
                  setSelectedStream(next);
                }}
                className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
              >
                {orderedStreams.map((stream) => (
                  <option key={stream.id} value={stream.uri_name}>
                    {stream.is_manual ? `Manual • ${stream.name}` : stream.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Manual streams</h2>
              <p className="text-sm text-zinc-400">
                Add streams that are missing from the API so they show up across the site.
              </p>
            </div>
            {manualLoading && <span className="text-xs text-zinc-500">Loading...</span>}
          </div>

          {manualError && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {manualError}
            </div>
          )}

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-3">
              {manualStreams.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800/80 bg-black/40 p-6 text-sm text-zinc-500">
                  No manual streams yet. Use the form to add the first one.
                </div>
              ) : (
                manualStreams.map((stream) => (
                  <div
                    key={stream.id}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-800/80 bg-black/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{stream.name}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {stream.tag} • {stream.category_name || "Manual"}
                      </div>
                      <div className="text-xs text-zinc-400 mt-2 break-all">
                        {stream.uri_name}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditManual(stream)}
                        disabled={manualSaving}
                        className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:border-emerald-500/70 disabled:opacity-60"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleManualDelete(stream.id)}
                        disabled={manualSaving}
                        className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:border-red-500/70 disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-black/40 p-5">
              <h3 className="text-base font-semibold">
                {editingManualId ? "Edit manual stream" : "Add manual stream"}
              </h3>
              <form onSubmit={handleManualSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Stream name</label>
                  <input
                    value={manualName}
                    onChange={(event) => setManualName(event.target.value)}
                    placeholder="e.g. Real Madrid vs Barcelona"
                    className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Stream slug (uri_name)</label>
                  <input
                    value={manualSlug}
                    onChange={(event) => setManualSlug(event.target.value)}
                    placeholder="e.g. laliga/2026-05-20/rma-bar"
                    className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Tag / League</label>
                    <input
                      value={manualTag}
                      onChange={(event) => setManualTag(event.target.value)}
                      placeholder="e.g. La Liga"
                      className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Category</label>
                    <input
                      value={manualCategory}
                      onChange={(event) => setManualCategory(event.target.value)}
                      placeholder="e.g. Soccer"
                      className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Stream thumbnail</label>
                  <input
                    value={manualPoster}
                    onChange={(event) => setManualPoster(event.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Stream link</label>
                  <input
                    value={manualStreamUrl}
                    onChange={(event) => setManualStreamUrl(event.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Stream link type</label>
                  <div className="flex flex-col gap-2">
                    {SOURCE_KIND_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                          manualStreamKind === option.value
                            ? "border-emerald-500/70 bg-emerald-500/10"
                            : "border-zinc-800/80 bg-black/40"
                        }`}
                      >
                        <span>{option.label}</span>
                        <input
                          type="radio"
                          name="manual-stream-kind"
                          value={option.value}
                          checked={manualStreamKind === option.value}
                          onChange={() => setManualStreamKind(option.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Start time</label>
                    <input
                      type="datetime-local"
                      value={manualStartsAt}
                      onChange={(event) => setManualStartsAt(event.target.value)}
                      className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">End time</label>
                    <input
                      type="datetime-local"
                      value={manualEndsAt}
                      onChange={(event) => setManualEndsAt(event.target.value)}
                      className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                      required
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={manualAlwaysLive}
                    onChange={(event) => setManualAlwaysLive(event.target.checked)}
                  />
                  Always live
                </label>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Viewers (optional)</label>
                  <input
                    value={manualViewers}
                    onChange={(event) => setManualViewers(event.target.value)}
                    placeholder="e.g. 125k"
                    className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Description (optional)</label>
                  <textarea
                    value={manualDescription}
                    onChange={(event) => setManualDescription(event.target.value)}
                    placeholder="Add details for the stream..."
                    className="min-h-20 w-full rounded-2xl border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={manualSaving}
                    className="flex-1 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {manualSaving ? "Saving..." : editingManualId ? "Save changes" : "Add manual stream"}
                  </button>
                  {editingManualId && (
                    <button
                      type="button"
                      onClick={resetManualForm}
                      disabled={manualSaving}
                      className="rounded-full border border-zinc-700/80 bg-black/60 px-4 py-3 text-sm text-zinc-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Current sources</h2>
                <p className="text-sm text-zinc-500">
                  {selectedStream ? selectedStream.name : "Select a stream"}
                </p>
              </div>
              {loadingSources && <span className="text-xs text-zinc-500">Loading...</span>}
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            {sources.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800/80 bg-black/40 p-6 text-sm text-zinc-500">
                No extra sources yet. Add the first one using the form.
              </div>
            ) : (
              <div className="space-y-3">
                {sources.map((source, index) => (
                  <div
                    key={source.key}
                    className="flex flex-col gap-3 rounded-xl border border-zinc-800/80 bg-black/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      {editingKey === source.key ? (
                        <div className="space-y-2">
                          <input
                            value={editLabel}
                            onChange={(event) => setEditLabel(event.target.value)}
                            className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-3 py-2 text-xs"
                          />
                          <input
                            value={editUrl}
                            onChange={(event) => setEditUrl(event.target.value)}
                            className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-3 py-2 text-xs"
                          />
                          <div className="flex gap-2">
                            {SOURCE_KIND_OPTIONS.map((option) => (
                              <label
                                key={option.value}
                                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] ${
                                  editKind === option.value
                                    ? "border-emerald-500/70 bg-emerald-500/10"
                                    : "border-zinc-800/80 bg-black/40"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`edit-kind-${source.key}`}
                                  value={option.value}
                                  checked={editKind === option.value}
                                  onChange={() => setEditKind(option.value)}
                                />
                                {option.label}
                              </label>
                            ))}
                          </div>
                          <label className="flex items-center gap-2 text-[11px] text-zinc-300">
                            <input
                              type="checkbox"
                              checked={editHidden}
                              onChange={(event) => setEditHidden(event.target.checked)}
                            />
                            Hidden
                          </label>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm font-semibold text-white">
                            {source.label}
                            {source.hidden && (
                              <span className="ml-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                                Hidden
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {source.origin.toUpperCase()} • {source.kind.toUpperCase()}
                            {source.createdAt ? ` • ${new Date(source.createdAt).toLocaleString()}` : ""}
                          </div>
                          <div className="text-xs text-zinc-400 mt-2 break-all">{source.url}</div>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveSource(index, -1)}
                          disabled={saving || index === 0}
                          className="rounded-full border border-zinc-700/80 bg-black/60 px-3 py-1.5 text-[11px] text-zinc-200 disabled:opacity-40"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSource(index, 1)}
                          disabled={saving || index === sources.length - 1}
                          className="rounded-full border border-zinc-700/80 bg-black/60 px-3 py-1.5 text-[11px] text-zinc-200 disabled:opacity-40"
                        >
                          ↓
                        </button>
                      </div>
                      {editingKey === source.key ? (
                        <>
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={saving}
                            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            disabled={saving}
                            className="rounded-full border border-zinc-700/80 bg-black/60 px-4 py-2 text-xs text-zinc-200"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(source)}
                          disabled={saving}
                          className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 hover:border-emerald-500/70 disabled:opacity-60"
                        >
                          Edit
                        </button>
                      )}
                      {source.origin === "admin" && editingKey !== source.key && (
                        <button
                          type="button"
                          onClick={() => handleRemove(source.key.replace("admin:", ""))}
                          disabled={saving}
                          className="rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:border-red-500/70 disabled:opacity-60"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 p-6">
            <h2 className="text-lg font-semibold">Add new source</h2>
            <p className="text-sm text-zinc-400">Paste a new stream link and label it.</p>

            <form onSubmit={handleAdd} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Label</label>
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="e.g. 4K • Spanish"
                  className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Source type</label>
                <div className="flex flex-col gap-2">
                  {SOURCE_KIND_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition ${
                        kind === option.value
                          ? "border-emerald-500/70 bg-emerald-500/10"
                          : "border-zinc-800/80 bg-black/40"
                      }`}
                    >
                      <span>{option.label}</span>
                      <input
                        type="radio"
                        name="source-kind"
                        value={option.value}
                        checked={kind === option.value}
                        onChange={() => setKind(option.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Source URL</label>
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-full border border-zinc-800/80 bg-black/70 px-4 py-3 text-sm"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={saving || !selectedStream}
                className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Add source"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
