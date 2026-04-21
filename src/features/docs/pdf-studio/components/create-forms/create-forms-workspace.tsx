"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { PdfPagePreviewPanel } from "@/features/docs/pdf-studio/components/shared/pdf-page-preview-panel";
import { useSinglePdfUpload } from "@/features/docs/pdf-studio/components/shared/use-single-pdf-upload";
import { createPdfFormFields } from "@/features/docs/pdf-studio/utils/pdf-form-writer";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";
import type { PdfFormFieldDraft, PdfFormFieldKind } from "@/features/docs/pdf-studio/types";

function buildFormDraft(
  pageIndex: number,
  kind: PdfFormFieldKind,
  label: string,
  width: number,
  height: number,
  x: number,
  y: number,
): PdfFormFieldDraft {
  return {
    id: crypto.randomUUID(),
    name: `${kind}-${pageIndex + 1}-${Date.now()}`,
    label,
    kind,
    pageIndex,
    x,
    y,
    width,
    height,
    required: false,
    defaultValue: kind === "signature" ? "" : undefined,
  };
}

export function CreateFormsWorkspace() {
  const analytics = usePdfStudioAnalytics("create-forms");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [placingField, setPlacingField] = useState<PdfFormFieldKind | null>(null);
  const [drafts, setDrafts] = useState<PdfFormFieldDraft[]>([]);
  const [fieldLabel, setFieldLabel] = useState("Field label");
  const [fieldWidth, setFieldWidth] = useState(0.28);
  const [fieldHeight, setFieldHeight] = useState(0.06);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const { file, pdfBytes, pages, loading, error, setError, onFileSelect } =
    useSinglePdfUpload("create-forms", analytics);

  const currentFields = useMemo(
    () => drafts.filter((draft) => draft.pageIndex === currentPage),
    [currentPage, drafts],
  );

  const handlePlaceField = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!placingField) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const relX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const relY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

      setDrafts((current) => [
        ...current,
        buildFormDraft(
          currentPage,
          placingField,
          fieldLabel || `${placingField} field`,
          fieldWidth,
          fieldHeight,
          Math.min(relX, 1 - fieldWidth),
          Math.min(relY, 1 - fieldHeight),
        ),
      ]);
      setPlacingField(null);
    },
    [currentPage, fieldHeight, fieldLabel, fieldWidth, placingField],
  );

  const handleGenerate = useCallback(async () => {
    if (!file || !pdfBytes || drafts.length === 0) {
      return;
    }

    setGenerating(true);
    setError(null);
    setWarnings([]);
    analytics.trackStart({ pageCount: pages.length, fieldCount: drafts.length });

    try {
      const result = await createPdfFormFields(pdfBytes, drafts);
      setWarnings(result.warnings);
      downloadPdfBytes(
        result.pdfBytes,
        buildPdfStudioOutputName({
          toolId: "create-forms",
          baseName: `${file.name.replace(/\.pdf$/i, "")}-form`,
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({ pageCount: pages.length, fieldCount: drafts.length });
    } catch {
      setError("Could not create form fields for this PDF. Please try again.");
      analytics.trackFail({ stage: "generate", reason: "processing-failed" });
    } finally {
      setGenerating(false);
    }
  }, [analytics, drafts, file, pages.length, pdfBytes, setError]);

  if (!file || pages.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
        <div className="pdf-studio-tool-header text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">Create Forms</h1>
          <p className="mt-2 text-sm text-[#666]">
            Place simple text, checkbox, date, and signature-placeholder fields on an existing PDF.
          </p>
        </div>
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <button
          className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#ddd] bg-white px-6 py-16 text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="text-sm font-medium text-[#1a1a1a]">
            {loading ? "Loading PDF..." : "Upload a PDF"}
          </span>
          <span className="mt-1 text-xs text-[#666]">Single PDF • up to 50 pages</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="application/pdf"
          onChange={(event) => void onFileSelect(event.target.files?.[0] ?? null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[360px,1fr]">
      <div className="space-y-4 rounded-2xl border border-[#e5e5e5] bg-white p-5">
        <div className="pdf-studio-tool-header">
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Create Forms</h1>
          <p className="mt-2 text-sm text-[#666]">
            Signature and date fields are created as compatible interactive placeholders, not certified signature workflows.
          </p>
        </div>

        <label className="block text-sm font-medium text-[#1a1a1a]">
          Field label
          <input
            className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
            value={fieldLabel}
            onChange={(event) => setFieldLabel(event.target.value)}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Field width
            <input
              type="number"
              min={0.1}
              max={0.8}
              step={0.02}
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={fieldWidth}
              onChange={(event) => setFieldWidth(Math.max(0.1, Number(event.target.value) || 0.28))}
            />
          </label>
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Field height
            <input
              type="number"
              min={0.04}
              max={0.2}
              step={0.01}
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={fieldHeight}
              onChange={(event) => setFieldHeight(Math.max(0.04, Number(event.target.value) || 0.06))}
            />
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {(["text", "checkbox", "signature", "date"] as PdfFormFieldKind[]).map((kind) => (
            <Button
              key={kind}
              variant="secondary"
              onClick={() => setPlacingField(kind)}
            >
              Place {kind}
            </Button>
          ))}
        </div>

        <div className="space-y-3 rounded-xl border border-[#eee] bg-[#fafafa] p-4">
          <p className="text-sm font-medium text-[#1a1a1a]">Current page fields</p>
          {currentFields.length === 0 ? (
            <p className="text-sm text-[#666]">Choose a field type, then click the preview to place it.</p>
          ) : (
            currentFields.map((draft) => (
              <div key={draft.id} className="rounded-lg border border-[#e6e6e6] bg-white px-3 py-2 text-sm">
                <div className="font-medium text-[#1a1a1a]">{draft.label}</div>
                <div className="text-xs text-[#666]">{draft.kind}</div>
              </div>
            ))
          )}
        </div>

        {warnings.length > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Button onClick={handleGenerate} disabled={drafts.length === 0 || generating}>
          {generating ? "Exporting..." : "Export fillable PDF"}
        </Button>
      </div>

      <PdfPagePreviewPanel
        pages={pages}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        overlay={
          <div
            className={`absolute inset-0 ${placingField ? "cursor-crosshair" : ""}`}
            onClick={handlePlaceField}
          >
            {currentFields.map((draft) => (
              <button
                key={draft.id}
                className="absolute rounded border-2 border-dashed border-[#1a3a5c] bg-white/70 p-1 text-left text-xs"
                style={{
                  left: `${draft.x * 100}%`,
                  top: `${draft.y * 100}%`,
                  width: `${draft.width * 100}%`,
                  height: `${draft.height * 100}%`,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setDrafts((current) => current.filter((item) => item.id !== draft.id));
                }}
              >
                {draft.label}
              </button>
            ))}
          </div>
        }
      />
    </div>
  );
}
