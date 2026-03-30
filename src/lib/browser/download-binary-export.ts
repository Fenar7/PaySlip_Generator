type DownloadBinaryExportOptions = {
  endpoint: string;
  payload: string;
  fallbackFilename: string;
};

function resolveFilename(
  contentDisposition: string | null,
  fallbackFilename: string,
) {
  if (!contentDisposition) {
    return fallbackFilename;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return fallbackFilename;
}

async function parseExportError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Export failed with status ${response.status}.`;
  } catch {
    return `Export failed with status ${response.status}.`;
  }
}

export async function downloadBinaryExport({
  endpoint,
  payload,
  fallbackFilename,
}: DownloadBinaryExportOptions) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error(await parseExportError(response));
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const filename = resolveFilename(
    response.headers.get("content-disposition"),
    fallbackFilename,
  );

  const link = window.document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  link.style.display = "none";
  window.document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(downloadUrl);
  }, 1000);
}
