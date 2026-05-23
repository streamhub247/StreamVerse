"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type OverlayAlert = {
  enabled: boolean;
  title?: string;
  message?: string;
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

type OverlayAlertClientProps = {
  initialAlert: OverlayAlert | null;
};

const POLL_INTERVAL_MS = 2000;

export default function OverlayAlertClient({ initialAlert }: OverlayAlertClientProps) {
  const [alert, setAlert] = useState<OverlayAlert | null>(initialAlert);
  const lastPayloadRef = useRef<string>("");

  function shouldShowForPath(alert: OverlayAlert | null, pathname: string) {
    if (!alert || !alert.enabled) return false;
    const target = alert.target ?? "all";
    if (target === "all") return true;
    if (target === "home") return pathname === "/" || pathname === "";
    if (target === "admin") return pathname.startsWith("/admin");
    if (target === "custom") {
      const paths = alert.customPaths ?? [];
      for (const p of paths) {
        const trimmed = p.trim();
        if (!trimmed) continue;
        if (trimmed === pathname) return true;
        if (pathname.startsWith(trimmed)) return true;
      }
      return false;
    }
    return true;
  }

  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return shouldShowForPath(initialAlert, window.location.pathname);
  });

  useEffect(() => {
    let isMounted = true;

    const fetchAlert = async () => {
      try {
        const res = await fetch("/api/overlay-alert", { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as OverlayAlert;
        const payload = JSON.stringify(data);
        if (payload === lastPayloadRef.current) {
          return;
        }
        lastPayloadRef.current = payload;
        if (isMounted) {
          setAlert(data.enabled ? data : null);
        }
      } catch {
        // ignore polling errors
      }
    };

    const interval = window.setInterval(fetchAlert, POLL_INTERVAL_MS);
    void fetchAlert();

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetch("/api/overlay-alert", { cache: "no-store" })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (!data) {
              return;
            }
            setAlert((data as OverlayAlert).enabled ? (data as OverlayAlert) : null);
          })
          .catch(() => undefined);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const overlaySizeClasses = {
    sm: "max-w-lg p-6 text-base",
    md: "max-w-2xl p-8 text-lg",
    lg: "max-w-4xl p-10 text-xl",
  } as const;
  useEffect(() => {
    setVisible(shouldShowForPath(alert, window.location.pathname));
  }, [alert]);

  const overlayStyle = alert?.backgroundColor || alert?.textColor
    ? {
        backgroundColor: alert?.backgroundColor || undefined,
        color: alert?.textColor || undefined,
      }
    : undefined;
  const overlayTextStyle = alert?.textColor ? { color: alert.textColor } : undefined;

  const sizeClass = useMemo(() => {
    const size = alert?.size ?? "md";
    return overlaySizeClasses[size];
  }, [alert?.size]);

  if (!alert?.message || !visible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
      <div
        className={`w-full rounded-3xl border border-white/10 bg-zinc-950/90 shadow-2xl ${sizeClass}`}
        style={overlayStyle}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          {alert.imageUrl && (
            (() => {
              const baseSize = alert.imageSize === "sm" ? 48 : alert.imageSize === "lg" ? 112 : 80;
              const percent = typeof alert.imageSizePercent === "number" && !Number.isNaN(alert.imageSizePercent)
                ? Math.max(1, alert.imageSizePercent)
                : 100;
              const scale = percent / 100;
              return (
                <div style={{ transformOrigin: "center" }}>
                  <img
                    src={alert.imageUrl}
                    alt="Alert"
                    className="rounded-full object-cover"
                    style={{ width: `${baseSize}px`, height: `${baseSize}px`, transform: `scale(${scale})` }}
                    loading="lazy"
                  />
                </div>
              );
            })()
          )}
          {alert.title && (
            <div className="text-sm font-semibold uppercase tracking-[0.3em] opacity-80" style={overlayTextStyle}>
              {alert.title}
            </div>
          )}
          <div className="text-balance font-semibold" style={overlayTextStyle}>
            {alert.message}
          </div>
          {alert.ctaText && alert.ctaUrl && (
            <a
              href={alert.ctaUrl}
              className="rounded-full border border-white/30 bg-black/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide"
              style={overlayTextStyle}
            >
              {alert.ctaText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
