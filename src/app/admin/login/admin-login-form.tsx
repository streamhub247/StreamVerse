"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
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
      setError("Unable to unlock admin right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800/80 bg-linear-to-br from-zinc-950/80 via-zinc-900/40 to-black/70 p-8 shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/40 bg-emerald-600/10 px-3 py-1 text-xs uppercase tracking-wide text-emerald-400">
          Admin Access
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Enter admin password</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Manage stream sources and keep your lineup up to date.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-zinc-500 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              className="w-full rounded-full bg-black/60 border border-zinc-800/80 px-4 py-3 text-sm outline-none focus:border-emerald-500/80"
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
            className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Unlocking..." : "Login to Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
