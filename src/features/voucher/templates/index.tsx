import type { JSX } from "react";
import type { VoucherDocument, VoucherTemplateId } from "@/features/voucher/types";
import { MinimalOfficeVoucherTemplate } from "@/features/voucher/templates/minimal-office";
import { TraditionalLedgerVoucherTemplate } from "@/features/voucher/templates/traditional-ledger";

export const voucherTemplateRegistry: Record<
  VoucherTemplateId,
  {
    name: string;
    component: ({
      document,
      mode,
    }: {
      document: VoucherDocument;
      mode?: "preview" | "print" | "pdf" | "png";
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
};
