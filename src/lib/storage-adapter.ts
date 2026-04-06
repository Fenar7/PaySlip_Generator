import "server-only";

export interface StorageAdapter {
  upload(
    bucket: string,
    path: string,
    data: Buffer,
    contentType: string
  ): Promise<{ key: string; url?: string }>;
  getSignedUrl(
    bucket: string,
    key: string,
    expiresIn?: number
  ): Promise<string>;
  delete(bucket: string, key: string): Promise<void>;
  getPublicUrl(bucket: string, key: string): string;
}

export class SupabaseStorageAdapter implements StorageAdapter {
  private async getClient() {
    const { createSupabaseServer } = await import("@/lib/supabase/server");
    return createSupabaseServer();
  }

  async upload(
    bucket: string,
    path: string,
    data: Buffer,
    contentType: string
  ): Promise<{ key: string; url?: string }> {
    const supabase = await this.getClient();
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, data, { contentType, upsert: true });

    if (error) throw new Error(`Supabase upload failed: ${error.message}`);

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);

    return { key: path, url: publicUrl };
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    expiresIn = 3600
  ): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${error?.message}`);
    }

    return data.signedUrl;
  }

  async delete(bucket: string, key: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await supabase.storage.from(bucket).remove([key]);
    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  }

  getPublicUrl(bucket: string, key: string): string {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${key}`;
  }
}

export class S3StorageAdapter implements StorageAdapter {
  async upload(): Promise<{ key: string; url?: string }> {
    throw new Error("S3 not configured");
  }

  async getSignedUrl(): Promise<string> {
    throw new Error("S3 not configured");
  }

  async delete(): Promise<void> {
    throw new Error("S3 not configured");
  }

  getPublicUrl(): string {
    throw new Error("S3 not configured");
  }
}

function getStorageAdapter(): StorageAdapter {
  const provider = process.env.STORAGE_PROVIDER ?? "supabase";

  switch (provider) {
    case "s3":
      return new S3StorageAdapter();
    case "supabase":
    default:
      return new SupabaseStorageAdapter();
  }
}

export const storage = getStorageAdapter();
