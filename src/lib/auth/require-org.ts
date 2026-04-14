import "server-only";

import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export interface OrgContext {
  userId: string;
  orgId: string;
  role: string;
}

export interface MarketplaceModeratorContext {
  userId: string;
  orgId: string | null;
  role: string | null;
}

export interface MarketplaceFinanceContext {
  userId: string;
  orgId: string | null;
  role: string | null;
}

export type AuthRoutingContext =
  | { isAuthenticated: false }
  | { isAuthenticated: true; userId: string; hasOrg: false }
  | { isAuthenticated: true; userId: string; hasOrg: true; orgId: string; role: string };

export async function getAuthRoutingContext(): Promise<AuthRoutingContext> {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { isAuthenticated: false };
  }

  const member = await db.member.findFirst({
    where: { userId: user.id },
    select: {
      organizationId: true,
      role: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!member) {
    return {
      isAuthenticated: true,
      userId: user.id,
      hasOrg: false,
    };
  }

  return {
    isAuthenticated: true,
    userId: user.id,
    hasOrg: true,
    orgId: member.organizationId,
    role: member.role,
  };
}

/**
 * Get the current user's organization context.
 * Throws if user is not authenticated or not a member of any organization.
 * 
 * Use in server actions:
 * ```
 * const { userId, orgId } = await requireOrgContext();
 * ```
 */
export async function requireOrgContext(): Promise<OrgContext> {
  const context = await getAuthRoutingContext();

  if (!context.isAuthenticated) {
    redirect("/auth/login");
  }

  if (!context.hasOrg) {
    redirect("/onboarding");
  }

  return {
    userId: context.userId,
    orgId: context.orgId,
    role: context.role,
  };
}

/**
 * Get organization context without redirecting.
 * Returns null if user is not authenticated or has no org.
 */
export async function getOrgContext(): Promise<OrgContext | null> {
  try {
    const context = await getAuthRoutingContext();

    if (!context.isAuthenticated || !context.hasOrg) {
      return null;
    }

    return {
      userId: context.userId,
      orgId: context.orgId,
      role: context.role,
    };
  } catch (e) {
    console.error("Error in getOrgContext:", e);
    return null;
  }
}

/**
 * Check if user has required role.
 * Roles: owner > admin > member
 */
export function hasRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = ["member", "admin", "owner"];
  const userLevel = roleHierarchy.indexOf(userRole);
  const requiredLevel = roleHierarchy.indexOf(requiredRole);
  return userLevel >= requiredLevel;
}

function getMarketplaceModeratorUserIds(): string[] {
  return (process.env.MARKETPLACE_MODERATOR_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getMarketplaceFinanceUserIds(): string[] {
  return (process.env.MARKETPLACE_FINANCE_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isMarketplaceModeratorUser(userId: string): boolean {
  return getMarketplaceModeratorUserIds().includes(userId);
}

export function isMarketplaceFinanceUser(userId: string): boolean {
  return getMarketplaceFinanceUserIds().includes(userId);
}

/**
 * Require a specific role, throw if insufficient permissions.
 */
export async function requireRole(requiredRole: string): Promise<OrgContext> {
  const context = await requireOrgContext();
  
  if (!hasRole(context.role, requiredRole)) {
    throw new Error(`Insufficient permissions. Required: ${requiredRole}, Have: ${context.role}`);
  }
  
  return context;
}

export async function requireMarketplaceModerator(): Promise<MarketplaceModeratorContext> {
  const context = await getAuthRoutingContext();

  if (!context.isAuthenticated) {
    redirect("/auth/login");
  }

  if (!isMarketplaceModeratorUser(context.userId)) {
    throw new Error("Marketplace moderation access denied");
  }

  return {
    userId: context.userId,
    orgId: context.hasOrg ? context.orgId : null,
    role: context.hasOrg ? context.role : null,
  };
}

export async function requireMarketplaceFinance(): Promise<MarketplaceFinanceContext> {
  const context = await getAuthRoutingContext();

  if (!context.isAuthenticated) {
    redirect("/auth/login");
  }

  if (!isMarketplaceFinanceUser(context.userId)) {
    throw new Error("Marketplace finance access denied");
  }

  return {
    userId: context.userId,
    orgId: context.hasOrg ? context.orgId : null,
    role: context.hasOrg ? context.role : null,
  };
}

export async function requireMarketplacePublisherAdmin(): Promise<OrgContext> {
  return requireRole("admin");
}

export async function requireMarketplaceFinanceOrModerator(): Promise<MarketplaceFinanceContext> {
  const context = await getAuthRoutingContext();

  if (!context.isAuthenticated) {
    redirect("/auth/login");
  }

  if (
    !isMarketplaceFinanceUser(context.userId) &&
    !isMarketplaceModeratorUser(context.userId)
  ) {
    throw new Error("Marketplace payout operator access denied");
  }

  return {
    userId: context.userId,
    orgId: context.hasOrg ? context.orgId : null,
    role: context.hasOrg ? context.role : null,
  };
}
