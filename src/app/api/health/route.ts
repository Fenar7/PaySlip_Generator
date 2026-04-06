import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function checkDatabase(): Promise<"connected" | "disconnected"> {
  try {
    await db.$queryRaw`SELECT 1`;
    return "connected";
  } catch {
    return "disconnected";
  }
}

async function checkCache(): Promise<"connected" | "unavailable"> {
  try {
    const { redis } = await import("@/lib/redis-client");
    if (!redis) return "unavailable";
    await redis.set("health:ping", "pong", 60);
    const result = await redis.get("health:ping");
    return result === "pong" ? "connected" : "unavailable";
  } catch {
    return "unavailable";
  }
}

export async function GET() {
  const [dbStatus, cacheStatus] = await Promise.all([
    checkDatabase(),
    checkCache(),
  ]);

  const status = dbStatus === "connected" ? "ok" : "degraded";
  const body = {
    status,
    db: dbStatus,
    cache: cacheStatus,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  };

  return NextResponse.json(body, {
    status: status === "ok" ? 200 : 503,
  });
}
