import { randomUUID } from "node:crypto";
import type { SalarySlipDocument } from "@/features/salary-slip/types";

const SESSION_TTL_MS = 5 * 60 * 1000;

type SalarySlipExportSession = {
  document: SalarySlipDocument;
  expiresAt: number;
};

declare global {
  var __salarySlipExportSessionStore:
    | Map<string, SalarySlipExportSession>
    | undefined;
}

function getStore() {
  if (!globalThis.__salarySlipExportSessionStore) {
    globalThis.__salarySlipExportSessionStore = new Map();
  }

  return globalThis.__salarySlipExportSessionStore;
}

function pruneExpiredSessions() {
  const now = Date.now();

  for (const [token, session] of getStore()) {
    if (session.expiresAt <= now) {
      getStore().delete(token);
    }
  }
}

export function createSalarySlipExportSession(document: SalarySlipDocument) {
  pruneExpiredSessions();

  const token = randomUUID();

  getStore().set(token, {
    document,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });

  return token;
}

export function getSalarySlipExportSession(token: string) {
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
