"use server";
import { db } from "@/lib/db";

export async function getOrgBranding(organizationId: string) {
  try {
    const branding = await db.brandingProfile.findUnique({
      where: { organizationId },
      select: { accentColor: true, fontFamily: true, fontColor: true },
    });
    return branding;
  } catch {
    return null;
  }
}
