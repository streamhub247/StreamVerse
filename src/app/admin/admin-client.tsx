"use client";

import { useEffect, useMemo, useState } from "react";

type StreamItem = {
  id: number;
  name: string;
  uri_name: string;
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

export default function AdminClient({ streams }: AdminClientProps) {
  const [selectedStream, setSelectedStream] = useState<StreamItem | null>(streams[0] ?? null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeEnabled, setNoticeEnabled] = useState(false);
  const [noticeTone, setNoticeTone] = useState<"info" | "warning" | "success" | "danger">("warning");
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeLoaded, setNoticeLoaded] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<"embed" | "m3u8">("embed");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editKind, setEditKind] = useState<"embed" | "m3u8">("embed");
  const [editHidden, setEditHidden] = useState(false);

  const orderedStreams = useMemo(
    () => [...streams].sort((a, b) => a.name.localeCompare(b.name)),
    [streams]
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

  useEffect(() => {
    if (selectedStream) {
      void loadSources(selectedStream.uri_name);
    }
  }, [selectedStream]);

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
          message?: string;
          enabled?: boolean;
          tone?: "info" | "warning" | "success" | "danger";
        };
        setNoticeMessage(data.message ?? "");
        setNoticeEnabled(Boolean(data.enabled));
        if (data.tone) {
          setNoticeTone(data.tone);
        }
      } finally {
        setNoticeLoaded(true);
      }
    };

    void loadNotice();
  }, [noticeLoaded]);

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
          message: noticeMessage,
          enabled: noticeEnabled,
          tone: noticeTone,
        }),
      });
    } finally {
      setNoticeSaving(false);
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
                    {stream.name}
                  </option>
                ))}
              </select>
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
