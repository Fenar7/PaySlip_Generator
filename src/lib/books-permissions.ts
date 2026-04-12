import {
  hasPermission,
  type Action,
  type Module,
  type Role,
} from "@/lib/permissions";

export const BOOKS_FINANCE_ROLES: readonly Role[] = [
  "owner",
  "admin",
  // Phase 16 WS-A maps finance_manager to the PRD's accountant role.
  "finance_manager",
] as const;

const BOOKS_FINANCE_ROLE_SET = new Set<Role>(BOOKS_FINANCE_ROLES);

export const APPROVAL_DOC_TYPES = [
  "invoice",
  "voucher",
  "salary-slip",
  "vendor-bill",
  "payment-run",
] as const;

export type ApprovalDocType = (typeof APPROVAL_DOC_TYPES)[number];

const FINANCE_APPROVAL_DOC_TYPE_SET = new Set<ApprovalDocType>([
  "vendor-bill",
  "payment-run",
]);

type NonFinanceApprovalDocType = Exclude<
  ApprovalDocType,
  "vendor-bill" | "payment-run"
>;

const APPROVAL_MODULE_BY_DOC_TYPE: Record<NonFinanceApprovalDocType, Module> = {
  invoice: "invoices",
  voucher: "vouchers",
  "salary-slip": "salary_slips",
};

const APPROVAL_REQUEST_ACTIONS_BY_DOC_TYPE: Record<
  NonFinanceApprovalDocType,
  Action[]
> = {
  invoice: ["create", "edit", "send", "approve"],
  voucher: ["create", "edit", "approve"],
  "salary-slip": ["create", "edit", "send"],
};

export function isBooksFinanceRole(role: string): role is Role {
  return BOOKS_FINANCE_ROLE_SET.has(role as Role);
}

export function canReadBooks(role: string): boolean {
  return isBooksFinanceRole(role);
}

export function canWriteBooks(role: string): boolean {
  return isBooksFinanceRole(role);
}

export function canDecideFinanceApproval(role: string): boolean {
  return isBooksFinanceRole(role);
}

export function isFinanceApprovalDocType(
  docType: string,
): docType is "vendor-bill" | "payment-run" {
  return FINANCE_APPROVAL_DOC_TYPE_SET.has(docType as ApprovalDocType);
}

export function isApprovalDocType(docType: string): docType is ApprovalDocType {
  return APPROVAL_DOC_TYPES.includes(docType as ApprovalDocType);
}

export function canRequestApprovalForDoc(role: string, docType: ApprovalDocType): boolean {
  if (isFinanceApprovalDocType(docType)) {
    return canWriteBooks(role);
  }

  const module = APPROVAL_MODULE_BY_DOC_TYPE[docType];
  const allowedActions = APPROVAL_REQUEST_ACTIONS_BY_DOC_TYPE[docType];

  return allowedActions.some((action) => hasPermission(role, module, action));
}

export function canViewApprovalForDoc(input: {
  role: string;
  docType: ApprovalDocType;
  isRequester: boolean;
}): boolean {
  if (input.isRequester) {
    return true;
  }

  if (isFinanceApprovalDocType(input.docType)) {
    return canReadBooks(input.role);
  }

  return hasPermission(input.role, "flow_approvals", "read");
}

export function canDecideApprovalForDoc(
  role: string,
  docType: ApprovalDocType,
): boolean {
  if (isFinanceApprovalDocType(docType)) {
    return canDecideFinanceApproval(role);
  }

  const module = APPROVAL_MODULE_BY_DOC_TYPE[docType];
  return (
    hasPermission(role, module, "approve") ||
    hasPermission(role, "flow_approvals", "approve")
  );
}
