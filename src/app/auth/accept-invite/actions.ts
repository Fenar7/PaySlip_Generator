"use server";

import { db } from "@/lib/db";
import { createSupabaseServer } from "@/lib/supabase/server";

export interface InvitationDetails {
  id: string;
  orgName: string;
  role: string;
  status: string;
  expired: boolean;
}

export type AcceptResult = { success: boolean; error?: string };

export async function getInvitationDetails(
  token: string
): Promise<InvitationDetails | null> {
  try {
    const invitation = await db.invitation.findUnique({
      where: { id: token },
      include: {
        organization: { select: { name: true } },
      },
    });

    if (!invitation) return null;

    return {
      id: invitation.id,
      orgName: invitation.organization.name,
      role: invitation.role ?? "viewer",
      status: invitation.status,
      expired: new Date(invitation.expiresAt) < new Date(),
    };
  } catch {
    return null;
  }
}

export async function acceptInvitation(
  token: string
): Promise<AcceptResult> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "You must be signed in to accept an invitation" };
    }

    const invitation = await db.invitation.findUnique({
      where: { id: token },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found" };
    }

    if (invitation.status !== "pending") {
      return { success: false, error: "This invitation has already been used" };
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return { success: false, error: "This invitation has expired" };
    }

    // Check if user is already a member
    const existingMember = await db.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      // Mark invitation as accepted even if already a member
      await db.invitation.update({
        where: { id: token },
        data: { status: "accepted" },
      });
      return { success: true };
    }

    // Create membership and mark invitation accepted in a transaction
    await db.$transaction([
      db.member.create({
        data: {
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role ?? "viewer",
        },
      }),
      db.invitation.update({
        where: { id: token },
        data: { status: "accepted" },
      }),
    ]);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to accept invitation",
    };
  }
}
