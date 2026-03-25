import type { VoucherDocument, VoucherTemplateId } from "@/features/voucher/types";
import { MinimalOfficeVoucherTemplate } from "@/features/voucher/templates/minimal-office";
import { TraditionalLedgerVoucherTemplate } from "@/features/voucher/templates/traditional-ledger";

export const voucherTemplateRegistry: Record<
  VoucherTemplateId,
  {
    name: string;
    component: ({ document }: { document: VoucherDocument }) => React.JSX.Element;
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
