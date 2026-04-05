import "server-only";

import { createSupabaseServer } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export interface OrgContext {
  userId: string;
  orgId: string;
  role: string;
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
  const supabase = await createSupabaseServer();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error("Auth error in requireOrgContext:", authError);
    redirect("/auth/login");
  }

  // Find user's membership
  const member = await db.member.findFirst({
    where: { userId: user.id },
    select: { 
      organizationId: true, 
      role: true 
    },
    orderBy: { createdAt: "desc" }, // Most recent org if multiple
  });

  if (!member) {
    // User exists but has no org - send to onboarding
    redirect("/onboarding");
  }

  return {
    userId: user.id,
    orgId: member.organizationId,
    role: member.role,
  };
}

/**
 * Get organization context without redirecting.
 * Returns null if user is not authenticated or has no org.
 */
export async function getOrgContext(): Promise<OrgContext | null> {
  try {
    const supabase = await createSupabaseServer();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return null;
    }

    const member = await db.member.findFirst({
      where: { userId: user.id },
      select: { 
        organizationId: true, 
        role: true 
      },
      orderBy: { createdAt: "desc" },
    });

    if (!member) {
      return null;
    }

    return {
      userId: user.id,
      orgId: member.organizationId,
      role: member.role,
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
