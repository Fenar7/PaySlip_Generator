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
  private async getS3Client() {
    const {
      S3Client,
      PutObjectCommand,
      DeleteObjectCommand,
      GetObjectCommand,
    } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

    const client = new S3Client({
      region: process.env.AWS_REGION ?? "ap-south-1",
    });

    return { client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, getSignedUrl };
  }

  async upload(
    bucket: string,
    path: string,
    data: Buffer,
    contentType: string
  ): Promise<{ key: string; url?: string }> {
    try {
      const { client, PutObjectCommand } = await this.getS3Client();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: path,
          Body: data,
          ContentType: contentType,
        })
      );
      return { key: path, url: this.getPublicUrl(bucket, path) };
    } catch (error) {
      throw new Error(
        `S3 upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    expiresIn = 3600
  ): Promise<string> {
    try {
      const { client, GetObjectCommand, getSignedUrl } =
        await this.getS3Client();
      return await getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn }
      );
    } catch (error) {
      throw new Error(
        `S3 signed URL failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async delete(bucket: string, key: string): Promise<void> {
    try {
      const { client, DeleteObjectCommand } = await this.getS3Client();
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key })
      );
    } catch (error) {
      throw new Error(
        `S3 delete failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  getPublicUrl(bucket: string, key: string): string {
    const cloudfrontUrl = process.env.CLOUDFRONT_URL;
    if (cloudfrontUrl) {
      return `${cloudfrontUrl}/${key}`;
    }
    const region = process.env.AWS_REGION ?? "ap-south-1";
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
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
