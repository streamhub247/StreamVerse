import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { getDatabase } from "@/lib/mongodb";
import OverlayAlertClient from "@/components/overlay-alert-client";
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
const OVERLAY_ALERT_ID = "global_overlay_alert";

async function getNotice() {
  try {
    const db = await getDatabase();
    const collection = db.collection<{
      _id: string;
      title?: string;
      message: string;
      enabled: boolean;
      tone?: "info" | "warning" | "success" | "danger";
      size?: "sm" | "md" | "lg";
      backgroundColor?: string;
      textColor?: string;
      imageUrl?: string;
      ctaText?: string;
      ctaUrl?: string;
    }>("site_notices");
    const record = await collection.findOne({ _id: NOTICE_ID });
    if (!record?.enabled || !record.message) {
      return null;
    }
    return {
      title: record.title ?? "",
      message: record.message,
      tone: record.tone ?? "warning",
      size: record.size ?? "md",
      backgroundColor: record.backgroundColor ?? "",
      textColor: record.textColor ?? "",
      imageUrl: record.imageUrl ?? "",
      ctaText: record.ctaText ?? "",
      ctaUrl: record.ctaUrl ?? "",
    };
  } catch {
    return null;
  }
}

async function getOverlayAlert() {
  try {
    const db = await getDatabase();
    const collection = db.collection<{
      _id: string;
      title?: string;
      message: string;
      enabled: boolean;
      size?: "sm" | "md" | "lg";
      backgroundColor?: string;
      textColor?: string;
      imageUrl?: string;
      ctaText?: string;
      ctaUrl?: string;
        target?: "all" | "home" | "admin" | "custom";
        customPaths?: string[];
        imageSize?: "sm" | "md" | "lg";
        imageSizePercent?: number;
      }>("site_overlays");
    const record = await collection.findOne({ _id: OVERLAY_ALERT_ID });
    if (!record?.enabled || !record.message) {
      return null;
    }
    return {
      enabled: true,
      title: record.title ?? "",
      message: record.message,
      size: record.size ?? "md",
      backgroundColor: record.backgroundColor ?? "",
      textColor: record.textColor ?? "",
      imageUrl: record.imageUrl ?? "",
      ctaText: record.ctaText ?? "",
      ctaUrl: record.ctaUrl ?? "",
      target: record.target ?? "all",
      customPaths: record.customPaths ?? [],
      imageSize: record.imageSize ?? "md",
      imageSizePercent: record.imageSizePercent ?? null,
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
  const overlayAlert = await getOverlayAlert();
  const toneClasses = {
    info: "bg-sky-600/90 text-white",
    warning: "bg-amber-500/90 text-black",
    success: "bg-emerald-600/90 text-white",
    danger: "bg-red-600/90 text-white",
  } as const;
  const sizeClasses = {
    sm: "py-2 text-sm",
    md: "py-3 text-base",
    lg: "py-4 text-lg",
  } as const;
  const noticeStyle = notice?.backgroundColor || notice?.textColor
    ? {
        backgroundColor: notice.backgroundColor || undefined,
        color: notice.textColor || undefined,
      }
    : undefined;
  const noticeTextStyle = notice?.textColor ? { color: notice.textColor } : undefined;
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
        <OverlayAlertClient initialAlert={overlayAlert} />
        {notice && (
          <div
            className={`w-full ${toneClasses[notice.tone]} ${sizeClasses[notice.size]}`}
            style={noticeStyle}
          >
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center font-medium md:flex-row md:justify-center">
              {notice.imageUrl && (
                <img
                  src={notice.imageUrl}
                  alt="Alert"
                  className="h-10 w-10 rounded-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="flex flex-col items-center gap-1">
                {notice.title && <div className="text-sm font-semibold uppercase tracking-wide">{notice.title}</div>}
                <div>{notice.message}</div>
              </div>
              {notice.ctaText && notice.ctaUrl && (
                <a
                  href={notice.ctaUrl}
                  className="rounded-full border border-white/30 bg-black/20 px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                  style={noticeTextStyle}
                >
                  {notice.ctaText}
                </a>
              )}
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
