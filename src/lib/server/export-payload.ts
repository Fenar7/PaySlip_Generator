import { gunzipSync, gzipSync } from "node:zlib";

export function serializeExportPayload<T>(document: T) {
  const json = JSON.stringify(document);
  return gzipSync(Buffer.from(json, "utf8")).toString("base64url");
}

export function deserializeExportPayload<T>(payload: string) {
  try {
    const json = gunzipSync(Buffer.from(payload, "base64url")).toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
