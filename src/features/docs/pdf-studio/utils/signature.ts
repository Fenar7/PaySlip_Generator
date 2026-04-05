const STORAGE_KEY = "slipwise-saved-signatures";
const MAX_SAVED = 3;

export function getSavedSignatures(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSignature(dataUrl: string): void {
  const saved = getSavedSignatures();
  saved.unshift(dataUrl);
  if (saved.length > MAX_SAVED) saved.pop();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

export function clearSavedSignatures(): void {
  localStorage.removeItem(STORAGE_KEY);
}
