import { NextRequest } from "next/server";

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function normalizeHost(value: string | null) {
  const first = firstHeaderValue(value);
  if (!first) {
    return null;
  }

  if (first.includes("://")) {
    try {
      return new URL(first).host || null;
    } catch {
      return null;
    }
  }

  return first;
}

function normalizeProto(value: string | null) {
  const first = firstHeaderValue(value);
  if (!first) {
    return null;
  }

  const proto = first.replace(/:$/, "").toLowerCase();
  return proto === "http" || proto === "https" ? proto : null;
}

export function getRequestOrigin(request: NextRequest) {
  const host =
    normalizeHost(request.headers.get("x-forwarded-host")) ??
    normalizeHost(request.headers.get("host")) ??
    request.nextUrl.host;

  const protocol =
    normalizeProto(request.headers.get("x-forwarded-proto")) ??
    request.nextUrl.protocol.replace(/:$/, "");

  return `${protocol}://${host}`;
}
