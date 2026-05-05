import { notFound } from "next/navigation";
import Link from "next/link";
import { getCustomerTimeline } from "../../actions";
import { CrmTimeline } from "../../components/crm-timeline";
import { CrmNoteForm } from "../../components/crm-note-form";
import { LifecycleSelectClient } from "../../components/lifecycle-select-client";
import {
  DetailLayout,
  DetailRailCard,
  DetailTopBar,
  MetadataField,
} from "@/components/layout/detail-layout";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

function formatINR(amount?: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default async function CustomerCrmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCustomerTimeline(id);

  if (!data) {
    notFound();
  }

  const { customer, events } = data;

  return (
    <div className="mx-auto max-w-[var(--container-content,80rem)]">
      <DetailLayout
        topBar={
          <DetailTopBar
            title={customer.name}
            subtitle={customer.email ?? undefined}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/app/crm"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-subtle)]"
                >
                  <ArrowLeft className="h-3 w-3" />
                  CRM
                </Link>
                <Link
                  href={`/app/data/customers/${customer.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-white px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-subtle)]"
                >
                  <ArrowUpRight className="h-3 w-3" />
                  Master Data
                </Link>
              </div>
            }
          />
        }
        rail={
          <>
            <DetailRailCard title="CRM Controls">
              <LifecycleSelectClient
                customerId={customer.id}
                initialStage={customer.lifecycleStage ?? "PROSPECT"}
              />
            </DetailRailCard>

            <DetailRailCard title="Summary">
              <dl className="space-y-3">
                {customer.email && <MetadataField label="Email" value={customer.email} />}
                {customer.phone && <MetadataField label="Phone" value={customer.phone} />}
                {customer.gstin && <MetadataField label="GSTIN" value={customer.gstin} />}
                <MetadataField label="Total Invoiced" value={formatINR(Number(customer.totalInvoiced))} />
                <MetadataField label="Total Paid" value={formatINR(Number(customer.totalPaid))} />
                <MetadataField label="Lifetime Value" value={formatINR(Number(customer.lifetimeValue))} />
                {customer.nextFollowUpAt && (
                  <MetadataField
                    label="Next Follow-up"
                    value={new Date(customer.nextFollowUpAt).toLocaleDateString("en-IN")}
                  />
                )}
              </dl>
            </DetailRailCard>

            {customer.tags.length > 0 && (
              <DetailRailCard title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-md bg-[var(--surface-subtle)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </DetailRailCard>
            )}
          </>
        }
      >
        <div className="space-y-6">
          <CrmNoteForm
            entityType="customer"
            entityId={customer.id}
            placeholder="Meeting notes, call summary, follow-up action…"
          />
          <CrmTimeline events={events} />
        </div>
      </DetailLayout>
    </div>
  );
}
