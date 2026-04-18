"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  exportTallyData,
  previewTallyImport,
  confirmTallyImport,
  type ImportPreviewRow,
} from "./actions";

export default function TallyIntegrationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Tally ERP</h1>
        <p className="text-sm text-[#666] mt-1">
          Import and export invoices and vouchers to/from Tally ERP 9 / Tally Prime.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <TallyExportCard />
        <TallyImportCard />
      </div>
    </div>
  );
}

// ─── Export Card ──────────────────────────────────────────────────────────────

function TallyExportCard() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeInvoices, setIncludeInvoices] = useState(true);
  const [includeVouchers, setIncludeVouchers] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    if (!from || !to) {
      setError("Please select a date range.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await exportTallyData({
        fromDate: from,
        toDate: to,
        includeInvoices,
        includeVouchers,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      // Trigger browser download
      const blob = new Blob([result.data.xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tally-export-${from}-to-${to}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-[#1a1a1a]">Export to Tally</h2>
        <p className="text-sm text-[#666]">
          Export invoices and/or vouchers as a Tally-compatible XML file.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#666] mb-1">
              From date
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-[#e5e5e5] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#666] mb-1">
              To date
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-[#e5e5e5] px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-[#1a1a1a]">
            <input
              type="checkbox"
              checked={includeInvoices}
              onChange={(e) => setIncludeInvoices(e.target.checked)}
              className="rounded"
            />
            Include invoices (Sales Vouchers)
          </label>
          <label className="flex items-center gap-2 text-sm text-[#1a1a1a]">
            <input
              type="checkbox"
              checked={includeVouchers}
              onChange={(e) => setIncludeVouchers(e.target.checked)}
              className="rounded"
            />
            Include vouchers (Payment/Receipt)
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          variant="primary"
          onClick={handleExport}
          disabled={isPending || (!includeInvoices && !includeVouchers)}
        >
          {isPending ? "Generating…" : "Download XML"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Import Card ──────────────────────────────────────────────────────────────

type ImportStep = "upload" | "preview" | "done";

function TallyImportCard() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [xmlContent, setXmlContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setXmlContent((ev.target?.result as string) ?? "");
    };
    reader.readAsText(file);
  }

  function handlePreview() {
    if (!xmlContent) {
      setError("Please select an XML file.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await previewTallyImport({ xmlContent, fileName });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPreview(result.data.rows);
      setParseErrors(result.data.errors);
      setStep("preview");
    });
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmTallyImport({ xmlContent, fileName });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setImportResult(result.data);
      setStep("done");
    });
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-[#1a1a1a]">Import from Tally</h2>
        <p className="text-sm text-[#666]">
          Upload a Tally XML export file to import records.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === "upload" && (
          <>
            <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#e5e5e5] p-8 cursor-pointer hover:border-[#666] transition-colors">
              <span className="text-sm text-[#666]">
                {fileName || "Click to select Tally XML file"}
              </span>
              <input
                type="file"
                accept=".xml"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              variant="primary"
              onClick={handlePreview}
              disabled={isPending || !xmlContent}
            >
              {isPending ? "Parsing…" : "Preview Import"}
            </Button>
          </>
        )}

        {step === "preview" && (
          <>
            {parseErrors.length > 0 && (
              <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
                {parseErrors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 font-medium">Type</th>
                    <th className="text-left py-1.5 font-medium">Number</th>
                    <th className="text-left py-1.5 font-medium">Party</th>
                    <th className="text-right py-1.5 font-medium">Amount</th>
                    <th className="text-left py-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b border-[#f5f5f5]">
                      <td className="py-1.5 capitalize">{row.type}</td>
                      <td className="py-1.5 font-mono">{row.voucherNumber}</td>
                      <td className="py-1.5 truncate max-w-[120px]">
                        {row.party}
                      </td>
                      <td className="py-1.5 text-right">
                        ₹{row.amount.toLocaleString()}
                      </td>
                      <td className="py-1.5">
                        {row.isDuplicate ? (
                          <span className="text-yellow-600">Duplicate</span>
                        ) : (
                          <span className="text-green-600">New</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={handleConfirm} disabled={isPending}>
                {isPending ? "Importing…" : "Confirm Import"}
              </Button>
              <Button variant="ghost" onClick={() => setStep("upload")}>
                Back
              </Button>
            </div>
          </>
        )}

        {step === "done" && importResult && (
          <div className="space-y-2 text-sm">
            <p className="text-green-700 font-medium">Import complete</p>
            <p>Imported: {importResult.imported} records</p>
            <p>Skipped (duplicates): {importResult.skipped} records</p>
            {importResult.errors.length > 0 && (
              <div className="rounded-md bg-red-50 p-2 text-red-700">
                {importResult.errors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                setStep("upload");
                setXmlContent("");
                setFileName("");
                setImportResult(null);
              }}
            >
              Import another file
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
