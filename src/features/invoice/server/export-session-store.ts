import { randomUUID } from "node:crypto";
import type { InvoiceDocument } from "@/features/invoice/types";

const SESSION_TTL_MS = 5 * 60 * 1000;

type InvoiceExportSession = {
  document: InvoiceDocument;
  expiresAt: number;
};

declare global {
  var __invoiceExportSessionStore:
    | Map<string, InvoiceExportSession>
    | undefined;
}

function getStore() {
  if (!globalThis.__invoiceExportSessionStore) {
    globalThis.__invoiceExportSessionStore = new Map();
  }

  return globalThis.__invoiceExportSessionStore;
}

function pruneExpiredSessions() {
  const now = Date.now();

  for (const [token, session] of getStore()) {
    if (session.expiresAt <= now) {
      getStore().delete(token);
    }
  }
}

export function createInvoiceExportSession(document: InvoiceDocument) {
  pruneExpiredSessions();

  const token = randomUUID();

  getStore().set(token, {
    document,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  return token;
}

export function getInvoiceExportSession(token: string) {
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
