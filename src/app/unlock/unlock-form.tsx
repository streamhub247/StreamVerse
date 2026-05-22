"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function UnlockForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        setError(data.message ?? "Invalid password");
        return;
      }

      router.replace(nextPath);
    } catch {
      setError("Unable to unlock right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800/80 bg-linear-to-br from-zinc-950/80 via-zinc-900/40 to-black/70 p-8 shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-red-600/40 bg-red-600/10 px-3 py-1 text-xs uppercase tracking-wide text-red-400">
          Private Preview
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Enter access password</h1>
        <p className="mt-2 text-sm text-zinc-400">
          This experience is currently locked while we refine the product.
        </p>

        <div className="mt-6 rounded-xl border border-zinc-800/80 bg-black/40 px-4 py-3 text-sm text-zinc-300">
          Contact me @ on twitter to get access.
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              className="w-full rounded-full bg-black/60 border border-zinc-800/80 px-4 py-3 text-sm outline-none focus:border-red-500/80"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            {loading ? "Unlocking..." : "Unlock"}
          </button>
        </form>
      </div>
    </div>
  );
}
