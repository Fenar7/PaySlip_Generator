"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  getVendorTimeline,
  createCrmNote,
  updateVendorCrmFields,
} from "../../actions";
import { CrmTimeline } from "../../components/crm-timeline";
import { CrmNoteForm } from "../../components/crm-note-form";
import { ComplianceSelect } from "../../components/compliance-select";
import {
  DetailLayout,
  DetailRailCard,
  DetailTopBar,
  MetadataField,
} from "@/components/layout/detail-layout";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

type Timeline = NonNullable<Awaited<ReturnType<typeof getVendorTimeline>>>;

function formatINR(amount?: number | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function VendorCrmPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!params.id) return;
    const result = await getVendorTimeline(params.id);
    setData(result);
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    async function run() {
      const result = await getVendorTimeline(params.id);
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [params.id]);

  async function handleNoteSubmit(content: string) {
    if (!params.id) return { success: false, error: "Missing ID" };
    const result = await createCrmNote({
      entityType: "vendor",
      entityId: params.id,
      content,
    });
    if (result.success) {
      await reload();
    }
    return result;
  }

  async function handleComplianceChange(status: string) {
    if (!params.id) return;
    await updateVendorCrmFields(params.id, {
      complianceStatus: status as Parameters<typeof updateVendorCrmFields>[1]["complianceStatus"],
    });
    await reload();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)]">
        <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-soft)] border-t-[var(--brand-primary)]" />
        Loading…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center text-sm text-[var(--text-muted)]">
        Vendor not found.
      </div>
    );
  }

  const { vendor, events } = data;

  return (
    <div className="mx-auto max-w-[var(--container-content,80rem)]">
      <DetailLayout
        topBar={
          <DetailTopBar
            title={vendor.name}
            subtitle={vendor.email ?? undefined}
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
                  href={`/app/data/vendors/${vendor.id}`}
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
              <ComplianceSelect
                value={vendor.complianceStatus ?? "PENDING"}
                onChange={handleComplianceChange}
              />
            </DetailRailCard>

            <DetailRailCard title="Finance">
              <dl className="space-y-3">
                <MetadataField label="Total Billed" value={formatINR(Number(vendor.totalBilled))} />
                <MetadataField label="Total Paid" value={formatINR(Number(vendor.totalPaid))} />
                <MetadataField label="Payment Terms" value={`${vendor.paymentTermsDays} days`} />
                <MetadataField label="Rating" value={vendor.rating != null ? `${vendor.rating} / 5` : "—"} />
              </dl>
            </DetailRailCard>

            <DetailRailCard title="Vendor Info">
              <dl className="space-y-3">
                {vendor.email && <MetadataField label="Email" value={vendor.email} />}
                {vendor.phone && <MetadataField label="Phone" value={vendor.phone} />}
                {vendor.gstin && <MetadataField label="GSTIN" value={vendor.gstin} />}
                {vendor.category && <MetadataField label="Category" value={vendor.category} />}
              </dl>
            </DetailRailCard>

            {vendor.tags.length > 0 && (
              <DetailRailCard title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {vendor.tags.map((tag) => (
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Total Billed" value={formatINR(Number(vendor.totalBilled))} />
            <KpiCard label="Total Paid" value={formatINR(Number(vendor.totalPaid))} />
            <KpiCard label="Payment Terms" value={`${vendor.paymentTermsDays}d`} />
            <KpiCard label="Rating" value={vendor.rating != null ? `${vendor.rating}/5` : "—"} />
          </div>

          <CrmNoteForm
            onSubmit={handleNoteSubmit}
            placeholder="Meeting notes, call log, compliance update…"
          />
          <CrmTimeline events={events} />
        </div>
      </DetailLayout>
    </div>
  );
}
