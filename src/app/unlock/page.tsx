import { Suspense } from "react";
import UnlockForm from "./unlock-form";

export default function UnlockPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800/80 bg-linear-to-br from-zinc-950/80 via-zinc-900/40 to-black/70 p-8 shadow-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-600/40 bg-red-600/10 px-3 py-1 text-xs uppercase tracking-wide text-red-400">
              Private Preview
            </div>
            <h1 className="mt-4 text-2xl font-semibold">Enter access password</h1>
            <p className="mt-2 text-sm text-zinc-400">Loading...</p>
          </div>
        </div>
      }
    >
      <UnlockForm />
    </Suspense>
  );
}
