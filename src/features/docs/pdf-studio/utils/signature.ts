const STORAGE_KEY = "slipwise-saved-signatures";
const MAX_SAVED = 3;

function scopedStorageKey(scope?: string): string {
  const normalizedScope = scope?.trim().replace(/[^a-zA-Z0-9_-]/g, "_") || "anonymous";
  return `${STORAGE_KEY}:${normalizedScope}`;
}

export function getSavedSignatures(scope?: string): string[] {
  try {
    const raw = localStorage.getItem(scopedStorageKey(scope));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSignature(dataUrl: string, scope?: string): void {
  const saved = getSavedSignatures(scope);
  saved.unshift(dataUrl);
  if (saved.length > MAX_SAVED) saved.pop();
  localStorage.setItem(scopedStorageKey(scope), JSON.stringify(saved));
}

export function clearSavedSignatures(scope?: string): void {
  localStorage.removeItem(scopedStorageKey(scope));
}
