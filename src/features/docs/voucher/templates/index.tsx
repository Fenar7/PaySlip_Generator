import type { JSX } from "react";
import type { VoucherDocument, VoucherTemplateId } from "@/features/docs/voucher/types";
import { MinimalOfficeVoucherTemplate } from "@/features/docs/voucher/templates/minimal-office";
import { TraditionalLedgerVoucherTemplate } from "@/features/docs/voucher/templates/traditional-ledger";

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
