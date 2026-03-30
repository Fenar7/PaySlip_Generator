export async function parseExportRequestBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  const formData = await request.formData();
  const payload = formData.get("payload");

  if (typeof payload !== "string") {
    throw new Error("Missing export payload.");
  }

  return JSON.parse(payload);
}
