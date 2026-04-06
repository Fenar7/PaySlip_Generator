import { zipSync } from "fflate";

export function buildZip(
  files: { name: string; data: Uint8Array }[]
): Blob {
  const zipData: Record<string, Uint8Array> = {};
  for (const f of files) {
    zipData[f.name] = f.data;
  }
  const zipped = zipSync(zipData);
  return new Blob([zipped as unknown as BlobPart], { type: "application/zip" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadPdfBytes(data: Uint8Array, filename: string) {
  const blob = new Blob([data as unknown as BlobPart], { type: "application/pdf" });
  downloadBlob(blob, filename);
}
