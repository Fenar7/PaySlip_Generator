/**
 * Helper to check if the test database is reachable.
 * Integration tests that need a real DB should skip if this returns false.
 */
import { db } from "@/lib/db";

let cachedReachable: boolean | undefined;

export async function isDatabaseReachable(): Promise<boolean> {
  if (cachedReachable !== undefined) return cachedReachable;
  try {
    await db.$queryRaw`SELECT 1`;
    cachedReachable = true;
    return true;
  } catch {
    cachedReachable = false;
    return false;
  }
}
