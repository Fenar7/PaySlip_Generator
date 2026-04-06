/**
 * Storage adapter interface.
 * Phase 0-1: local dev mock (returns placeholder URLs).
 * Phase 2+: swap LocalStorageAdapter for S3Adapter or R2Adapter.
 */

export interface StorageAdapter {
  upload(
    key: string,
    data: Buffer | Blob,
    contentType: string
  ): Promise<string>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

/** Development mock — no actual file storage, returns placeholder URLs */
class LocalStorageAdapter implements StorageAdapter {
  async upload(key: string, data: Buffer | Blob, contentType: string) {
    void data;
    void contentType;
    // In dev, just return the key as a mock URL
    return `/api/storage/dev/${key}`;
  }

  async getSignedUrl(key: string, expiresInSeconds?: number) {
    void expiresInSeconds;
    return `/api/storage/dev/${key}`;
  }

  async delete(key: string) {
    void key;
    // no-op in dev
  }
}

export const storage: StorageAdapter = new LocalStorageAdapter();

/**
 * Storage key helpers — consistent key patterns across the app
 * Usage: storageKeys.orgLogo(orgId)
 */
export const storageKeys = {
  orgLogo: (orgId: string) => `logos/org/${orgId}/logo`,
  userAvatar: (userId: string) => `avatars/user/${userId}`,
  documentExport: (orgId: string, docId: string, ext: "pdf" | "png") =>
    `documents/${orgId}/${docId}.${ext}`,
  paymentProof: (orgId: string, invoiceId: string, filename: string) =>
    `proofs/${orgId}/${invoiceId}/${filename}`,
};
