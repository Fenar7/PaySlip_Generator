"use server";

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { checkFeature } from "@/lib/plans/enforcement";
import { revalidatePath } from "next/cache";
import {
  generateClientId,
  generateClientSecret,
  hashSecret,
  hashToken,
  validateScopes,
} from "@/lib/oauth/utils";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

async function requireOAuthFeature() {
  const ctx = await requireRole("admin");
  const allowed = await checkFeature(ctx.orgId, "oauthApps");
  if (!allowed) {
    throw new Error("OAuth Apps require an upgraded plan.");
  }
  return ctx;
}

export async function createOAuthApp(input: {
  name: string;
  description?: string;
  websiteUrl?: string;
  redirectUris: string[];
  scopes: string[];
  isPublic?: boolean;
}): Promise<ActionResult<{ clientId: string; clientSecret: string }>> {
  try {
    const ctx = await requireOAuthFeature();

    if (!input.name.trim()) {
      return { success: false, error: "App name is required." };
    }
    if (input.redirectUris.length === 0) {
      return { success: false, error: "At least one redirect URI is required." };
    }
    if (!validateScopes(input.scopes)) {
      return { success: false, error: "One or more scopes are invalid." };
    }

    const clientId = generateClientId();
    const rawSecret = generateClientSecret();
    const hashedSecret = await hashSecret(rawSecret);

    await db.oAuthApp.create({
      data: {
        orgId: ctx.orgId,
        name: input.name.trim(),
        description: input.description?.trim() || "",
        websiteUrl: input.websiteUrl?.trim() || "",
        redirectUris: input.redirectUris.filter(Boolean),
        scopes: input.scopes,
        clientId,
        clientSecret: hashedSecret,
        isPublic: input.isPublic ?? false,
      },
    });

    revalidatePath("/app/settings/developer/oauth-apps");
    return { success: true, data: { clientId, clientSecret: rawSecret } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create OAuth app." };
  }
}

export async function listOAuthApps(): Promise<
  ActionResult<
    Array<{
      id: string;
      name: string;
      clientId: string;
      scopes: string[];
      isPublic: boolean;
      createdAt: Date;
    }>
  >
> {
  try {
    const ctx = await requireOAuthFeature();

    const apps = await db.oAuthApp.findMany({
      where: { orgId: ctx.orgId },
      select: { id: true, name: true, clientId: true, scopes: true, isPublic: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: apps };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to list apps." };
  }
}

export async function getOAuthApp(
  appId: string,
): Promise<
  ActionResult<{
    id: string;
    name: string;
    description: string;
    websiteUrl: string;
    clientId: string;
    redirectUris: string[];
    scopes: string[];
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  try {
    const ctx = await requireOAuthFeature();

    const app = await db.oAuthApp.findFirst({
      where: { id: appId, orgId: ctx.orgId },
      select: {
        id: true,
        name: true,
        description: true,
        websiteUrl: true,
        clientId: true,
        redirectUris: true,
        scopes: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!app) {
      return { success: false, error: "OAuth app not found." };
    }

    return { success: true, data: app };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to get app." };
  }
}

export async function rotateClientSecret(
  appId: string,
): Promise<ActionResult<{ clientSecret: string }>> {
  try {
    const ctx = await requireOAuthFeature();

    const app = await db.oAuthApp.findFirst({
      where: { id: appId, orgId: ctx.orgId },
    });
    if (!app) {
      return { success: false, error: "OAuth app not found." };
    }

    const rawSecret = generateClientSecret();
    const hashedSecret = await hashSecret(rawSecret);

    await db.oAuthApp.update({
      where: { id: appId },
      data: { clientSecret: hashedSecret },
    });

    revalidatePath("/app/settings/developer/oauth-apps");
    return { success: true, data: { clientSecret: rawSecret } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to rotate secret." };
  }
}

export async function deleteOAuthApp(appId: string): Promise<ActionResult<null>> {
  try {
    const ctx = await requireOAuthFeature();

    const app = await db.oAuthApp.findFirst({
      where: { id: appId, orgId: ctx.orgId },
    });
    if (!app) {
      return { success: false, error: "OAuth app not found." };
    }

    // Revoke all authorizations then delete the app
    await db.oAuthAuthorization.updateMany({
      where: { appId },
      data: { isRevoked: true },
    });
    await db.oAuthApp.delete({ where: { id: appId } });

    revalidatePath("/app/settings/developer/oauth-apps");
    return { success: true, data: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete app." };
  }
}

export async function listAppAuthorizations(
  appId: string,
): Promise<
  ActionResult<
    Array<{
      id: string;
      orgId: string;
      scopes: string[];
      isRevoked: boolean;
      createdAt: Date;
    }>
  >
> {
  try {
    const ctx = await requireOAuthFeature();

    const app = await db.oAuthApp.findFirst({
      where: { id: appId, orgId: ctx.orgId },
    });
    if (!app) {
      return { success: false, error: "OAuth app not found." };
    }

    const authorizations = await db.oAuthAuthorization.findMany({
      where: { appId },
      select: { id: true, orgId: true, scopes: true, isRevoked: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, data: authorizations };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to list authorizations." };
  }
}
