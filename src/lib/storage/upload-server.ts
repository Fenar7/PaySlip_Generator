"use server";

import { createSupabaseServer } from "@/lib/supabase/server";

export type StorageBucket = "logos" | "attachments" | "proofs";

export interface UploadResult {
  storageKey: string;
  publicUrl?: string;
}

/**
 * Server-side file upload to Supabase Storage
 */
export async function uploadFileServer(
  bucket: StorageBucket,
  path: string,
  fileBuffer: Buffer,
  contentType: string
): Promise<UploadResult> {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, fileBuffer, {
      contentType,
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    console.error("Server upload error:", error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const result: UploadResult = {
    storageKey: data.path,
  };

  if (bucket === "logos") {
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);
    result.publicUrl = urlData.publicUrl;
  }

  return result;
}

/**
 * Server-side signed URL generation
 */
export async function getSignedUrlServer(
  bucket: StorageBucket,
  storageKey: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storageKey, expiresInSeconds);

  if (error) {
    console.error("Server signed URL error:", error);
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Server-side file deletion
 */
export async function deleteFileServer(
  bucket: StorageBucket,
  storageKey: string
): Promise<void> {
  const supabase = await createSupabaseServer();

  const { error } = await supabase.storage.from(bucket).remove([storageKey]);

  if (error) {
    console.error("Server delete error:", error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
