"use server";

import { db } from "@/lib/db";
import { requireOrgContext } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface PresetComponent {
  label: string;
  amount: number;
  type: "earning" | "deduction";
}

export interface SalaryPresetInput {
  name: string;
  components: PresetComponent[];
}

export async function createSalaryPreset(
  input: SalaryPresetInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireOrgContext();
    const preset = await db.salaryPreset.create({
      data: {
        organizationId: orgId,
        name: input.name,
        components: input.components as object[],
      },
    });
    revalidatePath("/app/data/salary-presets");
    return { success: true, data: { id: preset.id } };
  } catch (error) {
    console.error("createSalaryPreset error:", error);
    return { success: false, error: "Failed to create preset" };
  }
}

export async function updateSalaryPreset(
  id: string,
  input: SalaryPresetInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await requireOrgContext();
    const existing = await db.salaryPreset.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return { success: false, error: "Preset not found" };

    await db.salaryPreset.update({
      where: { id },
      data: { name: input.name, components: input.components as object[] },
    });
    revalidatePath("/app/data/salary-presets");
    return { success: true, data: { id } };
  } catch (error) {
    console.error("updateSalaryPreset error:", error);
    return { success: false, error: "Failed to update preset" };
  }
}

export async function deleteSalaryPreset(id: string): Promise<ActionResult<void>> {
  try {
    const { orgId } = await requireOrgContext();
    const existing = await db.salaryPreset.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) return { success: false, error: "Preset not found" };

    await db.salaryPreset.delete({ where: { id } });
    revalidatePath("/app/data/salary-presets");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteSalaryPreset error:", error);
    return { success: false, error: "Failed to delete preset" };
  }
}

export async function listSalaryPresets(params?: { limit?: number; offset?: number }) {
  try {
    const { orgId } = await requireOrgContext();
    const where = { organizationId: orgId };
    const [presets, total] = await Promise.all([
      db.salaryPreset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...(params?.limit !== undefined && { take: params.limit }),
        ...(params?.offset !== undefined && { skip: params.offset }),
      }),
      db.salaryPreset.count({ where }),
    ]);
    return {
      presets: presets.map((p) => ({
        id: p.id,
        name: p.name,
        components: p.components as unknown as PresetComponent[],
      })),
      total,
    };
  } catch (error) {
    console.error("listSalaryPresets error:", error);
    return { presets: [], total: 0 };
  }
}

export async function getSalaryPreset(id: string) {
  try {
    const { orgId } = await requireOrgContext();
    const preset = await db.salaryPreset.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!preset) return null;
    return {
      id: preset.id,
      name: preset.name,
      components: preset.components as unknown as PresetComponent[],
    };
  } catch {
    return null;
  }
}
