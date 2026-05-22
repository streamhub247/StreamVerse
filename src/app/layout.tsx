import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { getDatabase } from "@/lib/mongodb";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DBS Streamz",
  description: "Pay-as-you-go sports streaming for Nepal. Preview app.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const NOTICE_ID = "global_notice";

async function getNotice() {
  try {
    const db = await getDatabase();
    const collection = db.collection<{
      _id: string;
      message: string;
      enabled: boolean;
      tone?: "info" | "warning" | "success" | "danger";
    }>("site_notices");
    const record = await collection.findOne({ _id: NOTICE_ID });
    if (!record?.enabled || !record.message) {
      return null;
    }
    return {
      message: record.message,
      tone: record.tone ?? "warning",
    };
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const notice = await getNotice();
  const toneClasses = {
    info: "bg-sky-600/90 text-white",
    warning: "bg-amber-500/90 text-black",
    success: "bg-emerald-600/90 text-white",
    danger: "bg-red-600/90 text-white",
  } as const;
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Script
          id="popunder-global"
          src="https://pl29523896.effectivecpmnetwork.com/f4/5e/08/f45e08efcf787f5e4b6b0cc0100a32b4.js"
          strategy="afterInteractive"
        />
        {notice && (
          <div className={`w-full text-sm ${toneClasses[notice.tone]}`}>
            <div className="mx-auto max-w-6xl px-6 py-2 text-center font-medium">
              {notice.message}
            </div>
          </div>
        )}
        <main className="flex-1">
          {children}
        </main>
        <footer className="mt-10 border-t border-zinc-900/80 bg-black/70 text-zinc-300">
          <div className="mx-auto max-w-6xl px-6 py-6 text-center text-xs sm:text-sm">
            Disclaimer: We only link to streams available on the internet. We do not host any content.
          </div>
        </footer>
      </body>
    </html>
  );
}
