type ExportFormat = "pdf" | "png";

type ExportSessionResponse = {
  pdfUrl?: string;
  pngUrl?: string;
};

type PrepareDocumentExportDownloadOptions = {
  sessionEndpoint: string;
  payload: string;
  format: ExportFormat;
  fallbackErrorMessage: string;
};

function resolveDownloadUrl(rawUrl: string) {
  const url = new URL(rawUrl, window.location.origin);
  url.searchParams.set("_dl", `${Date.now()}`);
  return url.toString();
}

async function parseSessionError(
  response: Response,
  fallbackErrorMessage: string,
) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallbackErrorMessage;
  } catch {
    return fallbackErrorMessage;
  }
}

export function startDocumentExportDownload(rawUrl: string) {
  const link = window.document.createElement("a");
  link.href = resolveDownloadUrl(rawUrl);
  link.rel = "noopener";
  link.style.display = "none";
  window.document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function prepareDocumentExportDownload({
  sessionEndpoint,
  payload,
  format,
  fallbackErrorMessage,
}: PrepareDocumentExportDownloadOptions) {
  const response = await fetch(sessionEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error(await parseSessionError(response, fallbackErrorMessage));
  }

  const session = (await response.json()) as ExportSessionResponse;
  const downloadUrl = format === "pdf" ? session.pdfUrl : session.pngUrl;

  if (!downloadUrl) {
    throw new Error(fallbackErrorMessage);
  }

  startDocumentExportDownload(downloadUrl);
  return downloadUrl;
}
