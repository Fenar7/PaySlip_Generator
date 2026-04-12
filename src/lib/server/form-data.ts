export type UploadedFileLike = File;

export function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    !!value &&
    typeof value === "object" &&
    typeof value.name === "string" &&
    typeof value.type === "string" &&
    typeof value.text === "function" &&
    typeof value.arrayBuffer === "function"
  );
}

export function isCsvUpload(value: UploadedFileLike): boolean {
  const name = value.name.trim().toLowerCase();
  const type = value.type.trim().toLowerCase();

  return (
    name.endsWith(".csv") ||
    type === "text/csv" ||
    type === "application/csv" ||
    type === "application/vnd.ms-excel" ||
    type.includes("csv")
  );
}
