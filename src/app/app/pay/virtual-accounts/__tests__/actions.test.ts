import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireOrgContext: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    customerVirtualAccount: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/razorpay/client", () => ({
  getOrgRazorpayClient: vi.fn(),
}));

import { db } from "@/lib/db";
import { requireOrgContext, requireRole } from "@/lib/auth";
import { getOrgRazorpayClient } from "@/lib/razorpay/client";
import {
  createCustomerVirtualAccount,
  listVirtualAccounts,
  closeCustomerVirtualAccount,
} from "@/app/app/pay/virtual-accounts/actions";

const mockDb = db as unknown as {
  customerVirtualAccount: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  customer: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const mockRequireRole = requireRole as ReturnType<typeof vi.fn>;
const mockRequireOrgContext = requireOrgContext as ReturnType<typeof vi.fn>;
const mockGetOrgRazorpayClient = getOrgRazorpayClient as ReturnType<typeof vi.fn>;

function mockAdmin(orgId = "org_1") {
  mockRequireRole.mockResolvedValue({ orgId, userId: "user_1", role: "admin" });
}

function mockOrgContext(orgId = "org_1") {
  mockRequireOrgContext.mockResolvedValue({ orgId, userId: "user_1", role: "member" });
}

describe("createCustomerVirtualAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error if customer not found in org (IDOR guard)", async () => {
    mockAdmin();
    mockDb.customer.findFirst.mockResolvedValue(null);
    const result = await createCustomerVirtualAccount("cust_other");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("returns existing active VA if one already exists (idempotent)", async () => {
    mockAdmin();
    const customer = { id: "cust_1", name: "Test Co", email: "test@co.com", razorpayCustomerId: "rz_c1" };
    const existingVa = { id: "va_1", orgId: "org_1", customerId: "cust_1", isActive: true, customer };
    mockDb.customer.findFirst.mockResolvedValue(customer);
    mockDb.customerVirtualAccount.findFirst.mockResolvedValue(existingVa);
    const result = await createCustomerVirtualAccount("cust_1");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe("va_1");
    // Should not call Razorpay SDK
    expect(mockGetOrgRazorpayClient).not.toHaveBeenCalled();
  });

  it("creates a Razorpay customer if razorpayCustomerId is null", async () => {
    mockAdmin();
    const customer = { id: "cust_1", name: "New Co", email: null, razorpayCustomerId: null };
    mockDb.customer.findFirst.mockResolvedValue(customer);
    mockDb.customerVirtualAccount.findFirst.mockResolvedValue(null); // no existing VA

    const mockRazorpay = {
      customers: {
        create: vi.fn().mockResolvedValue({ id: "rz_cust_new" }),
      },
      virtualAccounts: {
        create: vi.fn().mockResolvedValue({
          id: "va_rz_1",
          receivers: [{ account_number: "1234567890", ifsc: "RATN0VAAPIS" }],
        }),
      },
    };
    mockGetOrgRazorpayClient.mockResolvedValue(mockRazorpay);
    mockDb.customer.update.mockResolvedValue({});
    mockDb.customerVirtualAccount.create.mockResolvedValue({
      id: "va_db_1",
      orgId: "org_1",
      customerId: "cust_1",
      razorpayVaId: "va_rz_1",
      accountNumber: "1234567890",
      ifsc: "RATN0VAAPIS",
      isActive: true,
      createdAt: new Date(),
      closedAt: null,
      customer,
    });

    const result = await createCustomerVirtualAccount("cust_1");
    expect(result.success).toBe(true);
    expect(mockDb.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { razorpayCustomerId: "rz_cust_new" } })
    );
  });

  it("returns error if Razorpay returns no receiver", async () => {
    mockAdmin();
    const customer = { id: "cust_1", name: "Corp", email: "a@b.com", razorpayCustomerId: "rz_1" };
    mockDb.customer.findFirst.mockResolvedValue(customer);
    mockDb.customerVirtualAccount.findFirst.mockResolvedValue(null);

    const mockRazorpay = {
      virtualAccounts: {
        create: vi.fn().mockResolvedValue({ id: "va_rz_1", receivers: [] }),
      },
    };
    mockGetOrgRazorpayClient.mockResolvedValue(mockRazorpay);

    const result = await createCustomerVirtualAccount("cust_1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/receiver/i);
  });
});

describe("listVirtualAccounts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns org-scoped virtual accounts", async () => {
    mockOrgContext();
    const accounts = [
      { id: "va_1", orgId: "org_1", customer: { id: "c1", name: "A", email: null } },
    ];
    mockDb.customerVirtualAccount.findMany.mockResolvedValue(accounts);
    const result = await listVirtualAccounts();
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(1);
    expect(mockDb.customerVirtualAccount.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId: "org_1" } })
    );
  });
});

describe("closeCustomerVirtualAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error if VA not found in org (IDOR guard)", async () => {
    mockAdmin();
    mockDb.customerVirtualAccount.findFirst.mockResolvedValue(null);
    const result = await closeCustomerVirtualAccount("va_other");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("is idempotent: returns success if already inactive", async () => {
    mockAdmin();
    mockDb.customerVirtualAccount.findFirst.mockResolvedValue({
      id: "va_1",
      razorpayVaId: "rz_va_1",
      isActive: false,
    });
    const result = await closeCustomerVirtualAccount("va_1");
    expect(result.success).toBe(true);
    expect(mockGetOrgRazorpayClient).not.toHaveBeenCalled();
  });

  it("marks VA as inactive and sets closedAt", async () => {
    mockAdmin();
    mockDb.customerVirtualAccount.findFirst.mockResolvedValue({
      id: "va_1",
      razorpayVaId: "rz_va_1",
      isActive: true,
    });

    const mockRazorpay = {
      virtualAccounts: { close: vi.fn().mockResolvedValue({}) },
    };
    mockGetOrgRazorpayClient.mockResolvedValue(mockRazorpay);
    mockDb.customerVirtualAccount.update.mockResolvedValue({});

    const result = await closeCustomerVirtualAccount("va_1");
    expect(result.success).toBe(true);
    expect(mockDb.customerVirtualAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) })
    );
  });
});
