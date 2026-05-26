export const SITE_NAME = "DBS Streamz";
export const SITE_DESCRIPTION = "Live sports streaming updates, schedules, and match pages for global events.";

function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}

export function getBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL;
  if (explicit) {
    return normalizeBaseUrl(explicit);
  }

  if (process.env.VERCEL_URL) {
    return `https://${normalizeBaseUrl(process.env.VERCEL_URL)}`;
  }

  return "http://localhost:3000";
}

export function buildAbsoluteUrl(path = "/") {
  const base = getBaseUrl();
  if (!path || path === "/") {
    return base;
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function toAbsoluteImageUrl(imageUrl?: string | null) {
  if (!imageUrl) {
    return undefined;
  }

  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  return buildAbsoluteUrl(imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`);
}

export function buildEventTitle(name?: string, tag?: string) {
  if (!name) return SITE_NAME;
  if (tag) return `${name} — ${tag} live stream | ${SITE_NAME}`;
  return `${name} live stream | ${SITE_NAME}`;
}

export function buildEventDescription(name?: string, tag?: string) {
  if (name && tag) {
    return `${name} live stream from ${tag} on ${SITE_NAME}. Watch live with multiple sources and easy playback.`;
  }
  if (name) {
    return `${name} live stream on ${SITE_NAME}. Watch live with multiple sources and easy playback.`;
  }
  return SITE_DESCRIPTION;
}

export function parseTeamsFromName(name?: string) {
  if (!name) return null;
  const parts = name.split(/\s+v(?:s)?\.?\s+|\s+vs\.?\s+|\s+-\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { home: parts[0], away: parts[1] };
  }
  return null;
}
