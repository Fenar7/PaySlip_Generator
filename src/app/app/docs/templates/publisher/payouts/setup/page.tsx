import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getPublisherPayoutSetup, savePublisherPayoutBeneficiary } from "../actions";

export const metadata = {
  title: "Payout Setup | Slipwise",
};

function payoutBadgeVariant(status: string): "default" | "success" | "warning" | "danger" {
  if (status === "verified") return "success";
  if (status === "pending_verification") return "warning";
  if (status === "suspended") return "danger";
  return "default";
}

interface SetupPageProps {
  searchParams: Promise<{
    status?: string;
    error?: string;
  }>;
}

export default async function PublisherPayoutSetupPage({
  searchParams,
}: SetupPageProps) {
  const params = await searchParams;
  const result = await getPublisherPayoutSetup();

  if (!result.success) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      </div>
    );
  }

  const { beneficiary } = result.data;

  async function saveAction(formData: FormData) {
    "use server";

    const response = await savePublisherPayoutBeneficiary({
      accountHolderName: String(formData.get("accountHolderName") ?? ""),
      bankAccountNumber: String(formData.get("bankAccountNumber") ?? ""),
      ifscCode: String(formData.get("ifscCode") ?? ""),
      upiId: String(formData.get("upiId") ?? ""),
    });

    if (!response.success) {
      redirect(
        `/app/docs/templates/publisher/payouts/setup?error=${encodeURIComponent(
          response.error,
        )}`,
      );
    }

    redirect("/app/docs/templates/publisher/payouts/setup?status=saved");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/app/docs/templates/publisher/payouts"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Publisher Payouts
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Payout Setup
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure the payout destination used for publisher settlements. Updating these details resets verification.
          </p>
        </div>
        <Badge variant={payoutBadgeVariant(beneficiary?.status ?? "default")}>
          {beneficiary?.status?.replaceAll("_", " ") ?? "not configured"}
        </Badge>
      </div>

      {params.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(params.error)}
        </div>
      )}
      {params.status === "saved" && (
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          Payout setup saved. Verification is required before new revenue becomes payout-eligible.
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            Current payout destination
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Stored details are masked after save and cannot be re-read in plain text.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Account holder
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {beneficiary?.accountHolderName ?? "Not configured"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Payout method
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {beneficiary?.payoutMethod?.replaceAll("_", " ") ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Masked account
            </p>
            <p className="mt-1 text-sm text-slate-900">
              {beneficiary?.bankAccountMasked ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            Update payout details
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Provide a bank account + IFSC or a UPI ID. Saving new details resets beneficiary verification until finance re-verifies the destination.
          </p>
        </CardHeader>
        <CardContent>
          <form action={saveAction} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Account holder name
              </span>
              <input
                name="accountHolderName"
                defaultValue={beneficiary?.accountHolderName ?? ""}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                placeholder="Legal account holder name"
                required
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Bank account number
                </span>
                <input
                  name="bankAccountNumber"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                  placeholder="9 to 18 digits"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  IFSC code
                </span>
                <input
                  name="ifscCode"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm uppercase"
                  placeholder="ABCD0123456"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                UPI ID (optional alternative)
              </span>
              <input
                name="upiId"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                placeholder="publisher@upi"
              />
            </label>

            <div className="flex justify-end">
              <Button type="submit">Save Payout Details</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
