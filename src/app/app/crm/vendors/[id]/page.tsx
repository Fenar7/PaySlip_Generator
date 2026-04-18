"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getVendorTimeline, createCrmNote, updateVendorCrmFields } from "../../actions";

type Timeline = NonNullable<Awaited<ReturnType<typeof getVendorTimeline>>>;

const COMPLIANCE_STATUSES = ["PENDING", "VERIFIED", "SUSPENDED", "BLOCKED"] as const;

const EVENT_ICONS: Record<string, string> = {
  VENDOR_BILL_CREATED: "🧾",
  PO_CREATED: "📦",
  NOTE_ADDED: "📝",
};

function formatINR(amount?: number) {
  if (amount == null) return "";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export default function VendorCrmPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  async function load() {
    if (!params.id) return;
    const result = await getVendorTimeline(params.id);
    setData(result);
    setLoading(false);
  }

  useEffect(() => { load(); }, [params.id]);

  async function handleNoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || !params.id) return;
    setSubmittingNote(true);
    const result = await createCrmNote({
      entityType: "vendor",
      entityId: params.id,
      content: noteText.trim(),
    });
    setSubmittingNote(false);
    if (result.success) {
      setNoteText("");
      await load();
    }
  }

  async function handleComplianceChange(status: string) {
    if (!params.id) return;
    await updateVendorCrmFields(params.id, { complianceStatus: status as Parameters<typeof updateVendorCrmFields>[1]["complianceStatus"] });
    await load();
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading…</div>;
  if (!data) return <div className="p-8 text-center text-slate-400">Vendor not found.</div>;

  const { vendor, events } = data;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-2">
        <Link href="/app/crm" className="text-xs text-blue-600 hover:underline">← CRM</Link>
      </div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{vendor.name}</h1>
          {vendor.email && <p className="text-sm text-slate-500">{vendor.email}</p>}
          {vendor.gstin && <p className="text-xs text-slate-400 font-mono mt-0.5">GSTIN: {vendor.gstin}</p>}
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Compliance Status</label>
          <select
            value={vendor.complianceStatus ?? "PENDING"}
            onChange={(e) => handleComplianceChange(e.target.value)}
            className="border rounded px-2 py-1.5 text-sm"
          >
            {COMPLIANCE_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Total Billed</p>
          <p className="text-lg font-semibold">{formatINR(Number(vendor.totalBilled))}</p>
        </div>
        <div className="rounded border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Total Paid</p>
          <p className="text-lg font-semibold">{formatINR(Number(vendor.totalPaid))}</p>
        </div>
        <div className="rounded border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Payment Terms</p>
          <p className="text-lg font-semibold">{vendor.paymentTermsDays ?? 30}d</p>
        </div>
        <div className="rounded border bg-white p-3 shadow-sm">
          <p className="text-xs text-slate-500">Rating</p>
          <p className="text-lg font-semibold">{vendor.rating != null ? `${vendor.rating}/5` : "—"}</p>
        </div>
      </div>

      {/* Add Note */}
      <form onSubmit={handleNoteSubmit} className="mb-6 p-4 rounded-lg border bg-white shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Add Note</h2>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Meeting notes, call log, compliance update…"
          rows={3}
          className="w-full border rounded px-3 py-2 text-sm resize-none"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="submit"
            disabled={!noteText.trim() || submittingNote}
            className="bg-blue-600 text-white text-xs px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {submittingNote ? "Saving…" : "Save Note"}
          </button>
        </div>
      </form>

      {/* Timeline */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Timeline</h2>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No events yet.</p>
        ) : (
          <div className="relative border-l-2 border-slate-100 pl-6 space-y-4">
            {events.map((ev) => (
              <div key={ev.id} className="relative">
                <span className="absolute -left-8 top-0.5 text-base">
                  {EVENT_ICONS[ev.eventType] ?? "•"}
                </span>
                <div className="rounded-lg border bg-white p-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-slate-800">{ev.title}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(ev.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  {ev.amount != null && (
                    <p className="text-xs text-slate-500 mt-1">{formatINR(ev.amount)}</p>
                  )}
                  {ev.status && (
                    <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {ev.status.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
