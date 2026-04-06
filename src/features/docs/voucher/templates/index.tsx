import type { JSX } from "react";
import type { VoucherDocument, VoucherTemplateId } from "@/features/docs/voucher/types";
import { MinimalOfficeVoucherTemplate } from "@/features/docs/voucher/templates/minimal-office";
import { TraditionalLedgerVoucherTemplate } from "@/features/docs/voucher/templates/traditional-ledger";
import { ModernCardVoucherTemplate } from "@/features/docs/voucher/templates/modern-card";
import { FormalBorderedVoucherTemplate } from "@/features/docs/voucher/templates/formal-bordered";
import { CompactReceiptVoucherTemplate } from "@/features/docs/voucher/templates/compact-receipt";

export const voucherTemplateRegistry: Record<
  VoucherTemplateId,
  {
    name: string;
    component: ({
      document,
      mode,
    }: {
      document: VoucherDocument;
      mode?: "preview" | "print" | "pdf" | "png" | "edit";
    }) => JSX.Element;
  }
> = {
  "minimal-office": {
    name: "Minimal Office",
    component: MinimalOfficeVoucherTemplate,
  },
  "traditional-ledger": {
    name: "Traditional Ledger",
    component: TraditionalLedgerVoucherTemplate,
  },
  "modern-card": {
    name: "Modern Card",
    component: ModernCardVoucherTemplate,
  },
  "formal-bordered": {
    name: "Formal Bordered",
    component: FormalBorderedVoucherTemplate,
  },
  "compact-receipt": {
    name: "Compact Receipt",
    component: CompactReceiptVoucherTemplate,
  },
};
