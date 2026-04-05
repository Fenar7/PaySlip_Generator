import { createSupabaseBrowser } from "@/lib/supabase/client";

export type StorageBucket = "logos" | "attachments" | "proofs";

export interface UploadResult {
  storageKey: string;
  publicUrl?: string;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File
): Promise<UploadResult> {
  const supabase = createSupabaseBrowser();
  
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const result: UploadResult = {
    storageKey: data.path,
  };

  // Get public URL for logos bucket
  if (bucket === "logos") {
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
    result.publicUrl = urlData.publicUrl;
  }

  return result;
}

/**
 * Get a signed URL for private files (attachments, proofs)
 */
export async function getSignedUrl(
  bucket: StorageBucket,
  storageKey: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const supabase = createSupabaseBrowser();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storageKey, expiresInSeconds);

  if (error) {
    console.error("Signed URL error:", error);
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  bucket: StorageBucket,
  storageKey: string
): Promise<void> {
  const supabase = createSupabaseBrowser();

  const { error } = await supabase.storage
    .from(bucket)
    .remove([storageKey]);

  if (error) {
    console.error("Delete error:", error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Generate a storage path for an entity attachment
 */
export function generateStoragePath(
  orgId: string,
  entityType: "invoice" | "voucher" | "salary_slip" | "proof",
  entityId: string,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${orgId}/${entityType}/${entityId}/${timestamp}_${sanitizedName}`;
}

/**
 * Generate a logo path
 */
export function generateLogoPath(orgId: string, fileName: string): string {
  const ext = fileName.split(".").pop() || "png";
  return `${orgId}/logo.${ext}`;
}
