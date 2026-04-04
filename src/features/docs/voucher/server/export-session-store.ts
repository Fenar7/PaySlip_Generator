import { randomUUID } from "node:crypto";
import type { VoucherDocument } from "@/features/docs/voucher/types";

const SESSION_TTL_MS = 5 * 60 * 1000;

type VoucherExportSession = {
  document: VoucherDocument;
  expiresAt: number;
};

declare global {
  var __voucherExportSessionStore:
    | Map<string, VoucherExportSession>
    | undefined;
}

function getStore() {
  if (!globalThis.__voucherExportSessionStore) {
    globalThis.__voucherExportSessionStore = new Map();
  }

  return globalThis.__voucherExportSessionStore;
}

function pruneExpiredSessions() {
  const now = Date.now();

  for (const [token, session] of getStore()) {
    if (session.expiresAt <= now) {
      getStore().delete(token);
    }
  }
}

export function createVoucherExportSession(document: VoucherDocument) {
  pruneExpiredSessions();

  const token = randomUUID();

  getStore().set(token, {
    document,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  return token;
}

export function getVoucherExportSession(token: string) {
  pruneExpiredSessions();

  const session = getStore().get(token);

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    getStore().delete(token);
    return null;
  }

  return session.document;
}
