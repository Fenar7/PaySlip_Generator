"use server";
import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { getOrgRazorpayClient } from "@/lib/razorpay/client";
import type { CustomerVirtualAccount } from "@/generated/prisma/client";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type VirtualAccountWithCustomer = CustomerVirtualAccount & {
  customer: { id: string; name: string; email: string | null };
};

/**
 * Create a Razorpay virtual account for a customer.
 * Idempotent: returns the existing active VA if one already exists.
 */
export async function createCustomerVirtualAccount(
  customerId: string
): Promise<ActionResult<VirtualAccountWithCustomer>> {
  const { orgId } = await requireRole("admin");

  // IDOR guard: verify customer belongs to this org
  const customer = await db.customer.findFirst({
    where: { id: customerId, organizationId: orgId },
    select: { id: true, name: true, email: true, razorpayCustomerId: true },
  });
  if (!customer) {
    return { success: false, error: "Customer not found." };
  }

  // Idempotency: return existing active VA
  const existing = await db.customerVirtualAccount.findFirst({
    where: { orgId, customerId, isActive: true },
    include: { customer: { select: { id: true, name: true, email: true } } },
  });
  if (existing) {
    return { success: true, data: existing };
  }

  const razorpay = await getOrgRazorpayClient(orgId);

  // Ensure the customer has a Razorpay customer ID
  let razorpayCustomerId = customer.razorpayCustomerId;
  if (!razorpayCustomerId) {
    const createCustomerFn = razorpay.customers.create.bind(
      razorpay.customers
    ) as (p: Record<string, unknown>) => Promise<{ id: string }>;

    const rzCustomer = await createCustomerFn({
      name: customer.name,
      ...(customer.email ? { email: customer.email } : {}),
    });

    razorpayCustomerId = rzCustomer.id;
    await db.customer.update({
      where: { id: customerId },
      data: { razorpayCustomerId },
    });
  }

  // Create virtual account on Razorpay
  const createVaFn = (razorpay.virtualAccounts as unknown as {
    create: (p: Record<string, unknown>) => Promise<{
      id: string;
      receivers: Array<{ account_number: string; ifsc: string }>;
    }>;
  }).create.bind(razorpay.virtualAccounts) as (
    p: Record<string, unknown>
  ) => Promise<{ id: string; receivers: Array<{ account_number: string; ifsc: string }> }>;

  const va = await createVaFn({
    receivers: { types: ["bank_account"] },
    description: `Virtual account for ${customer.name}`,
    customer_id: razorpayCustomerId,
    close_by: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365, // 1 year TTL
  });

  const receiver = va.receivers?.[0];
  if (!receiver) {
    return { success: false, error: "Razorpay did not return a bank receiver." };
  }

  const created = await db.customerVirtualAccount.create({
    data: {
      orgId,
      customerId,
      razorpayVaId: va.id,
      accountNumber: receiver.account_number,
      ifsc: receiver.ifsc,
      isActive: true,
    },
    include: { customer: { select: { id: true, name: true, email: true } } },
  });

  return { success: true, data: created };
}

/**
 * List all virtual accounts for the org.
 */
export async function listVirtualAccounts(): Promise<
  ActionResult<VirtualAccountWithCustomer[]>
> {
  const { orgId } = await requireOrgContext();

  const accounts = await db.customerVirtualAccount.findMany({
    where: { orgId },
    include: { customer: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  return { success: true, data: accounts };
}

/**
 * Close a virtual account for a customer.
 */
export async function closeCustomerVirtualAccount(
  virtualAccountId: string
): Promise<ActionResult<void>> {
  const { orgId } = await requireRole("admin");

  const va = await db.customerVirtualAccount.findFirst({
    where: { id: virtualAccountId, orgId },
    select: { id: true, razorpayVaId: true, isActive: true },
  });

  if (!va) return { success: false, error: "Virtual account not found." };
  if (!va.isActive) return { success: true, data: undefined }; // Idempotent

  const razorpay = await getOrgRazorpayClient(orgId);

  // PATCH on Razorpay to close the VA (close_by = now)
  try {
    const patchFn = (razorpay.virtualAccounts as unknown as {
      close: (id: string) => Promise<unknown>;
    }).close;
    if (typeof patchFn === "function") {
      await patchFn.call(razorpay.virtualAccounts, va.razorpayVaId);
    }
  } catch {
    // Non-fatal: log and continue — mark as closed locally regardless
    console.error("[virtual-accounts] failed to close VA on Razorpay:", va.razorpayVaId);
  }

  await db.customerVirtualAccount.update({
    where: { id: va.id },
    data: { isActive: false, closedAt: new Date() },
  });

  return { success: true, data: undefined };
}
