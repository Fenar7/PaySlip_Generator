"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { useActiveOrg } from "@/hooks/use-active-org";
import { usePdfStudioAnalytics } from "@/features/docs/pdf-studio/lib/analytics";
import { buildPdfStudioOutputName } from "@/features/docs/pdf-studio/lib/output";
import { PdfPagePreviewPanel } from "@/features/docs/pdf-studio/components/shared/pdf-page-preview-panel";
import { useSinglePdfUpload } from "@/features/docs/pdf-studio/components/shared/use-single-pdf-upload";
import { SignatureCanvas } from "@/features/docs/pdf-studio/components/fill-sign/signature-canvas";
import {
  clearSavedSignatures,
  getSavedSignatures,
  saveSignature,
} from "@/features/docs/pdf-studio/utils/signature";
import { applyPdfEditorObjects } from "@/features/docs/pdf-studio/utils/pdf-editor-writer";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";
import type { PdfEditorObject, PdfEditorShapeType } from "@/features/docs/pdf-studio/types";

type EditorMode =
  | { type: "none" }
  | { type: "text" }
  | { type: "date" }
  | { type: "shape" }
  | { type: "image"; dataUrl: string }
  | { type: "signature"; dataUrl: string };

export function EditorWorkspace() {
  const analytics = usePdfStudioAnalytics("editor");
  const { activeOrg, isLoading: orgLoading } = useActiveOrg();
  const orgScope = activeOrg?.id ?? "anonymous";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState<EditorMode>({ type: "none" });
  const [objects, setObjects] = useState<PdfEditorObject[]>([]);
  const [savedSignatures, setSavedSignatures] = useState<string[]>([]);
  const [text, setText] = useState("Edit me");
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState<"helvetica" | "times">("helvetica");
  const [textColor, setTextColor] = useState("#1a1a1a");
  const [shapeType, setShapeType] = useState<PdfEditorShapeType>("rectangle");
  const [shapeWidth, setShapeWidth] = useState(0.25);
  const [shapeHeight, setShapeHeight] = useState(0.1);
  const [strokeColor, setStrokeColor] = useState("#1a1a1a");
  const [fillColor, setFillColor] = useState("#ffffff");
  const { file, pdfBytes, pages, loading, error, setError, onFileSelect } =
    useSinglePdfUpload("editor", analytics);

  useEffect(() => {
    if (orgLoading) {
      return;
    }

    setSavedSignatures(getSavedSignatures(orgScope));
  }, [orgLoading, orgScope]);

  const currentObjects = useMemo(
    () => objects.filter((object) => object.pageIndex === currentPage),
    [currentPage, objects],
  );

  const handlePagePlacement = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (mode.type === "none") {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const relX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const relY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

      if (mode.type === "text" || mode.type === "date") {
        const nextText =
          mode.type === "date" ? new Date().toLocaleDateString() : text || "Edit me";
        setObjects((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            type: mode.type,
            text: nextText,
            pageIndex: currentPage,
            x: relX,
            y: relY,
            fontSize,
            color: textColor,
            fontFamily,
          },
        ]);
        setMode({ type: "none" });
        return;
      }

      if (mode.type === "shape") {
        setObjects((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            type: "shape",
            shapeType,
            pageIndex: currentPage,
            x: Math.min(relX, 1 - shapeWidth),
            y: Math.min(relY, 1 - shapeHeight),
            width: shapeWidth,
            height: shapeHeight,
            strokeColor,
            fillColor,
            strokeWidth: 1.5,
          },
        ]);
        setMode({ type: "none" });
        return;
      }

      setObjects((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          type: mode.type,
          dataUrl: mode.dataUrl,
          pageIndex: currentPage,
          x: Math.min(relX, 0.75),
          y: Math.min(relY, 0.88),
          width: 0.22,
          height: 0.1,
        },
      ]);
      setMode({ type: "none" });
    },
    [
      currentPage,
      fillColor,
      fontFamily,
      fontSize,
      mode,
      shapeHeight,
      shapeType,
      shapeWidth,
      strokeColor,
      text,
      textColor,
    ],
  );

  const handleSignatureSave = useCallback(
    (dataUrl: string) => {
      saveSignature(dataUrl, orgScope);
      setSavedSignatures(getSavedSignatures(orgScope));
      setMode({ type: "signature", dataUrl });
    },
    [orgScope],
  );

  const handleImageSelect = useCallback(async (fileList: FileList | null) => {
    const imageFile = fileList?.[0];
    if (!imageFile) {
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("image-read-failed"));
      reader.readAsDataURL(imageFile);
    });
    setMode({ type: "image", dataUrl });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!file || !pdfBytes || objects.length === 0) {
      return;
    }

    setGenerating(true);
    setError(null);
    analytics.trackStart({ pageCount: pages.length, objectCount: objects.length });

    try {
      const result = await applyPdfEditorObjects(pdfBytes, objects);
      downloadPdfBytes(
        result,
        buildPdfStudioOutputName({
          toolId: "editor",
          baseName: `${file.name.replace(/\.pdf$/i, "")}-edited`,
          extension: "pdf",
        }),
      );
      analytics.trackSuccess({ pageCount: pages.length, objectCount: objects.length });
    } catch {
      setError("Could not export this edited PDF. Please try again.");
      analytics.trackFail({ stage: "generate", reason: "processing-failed" });
    } finally {
      setGenerating(false);
    }
  }, [analytics, file, objects, pages.length, pdfBytes, setError]);

  if (!file || pages.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:py-12">
        <div className="pdf-studio-tool-header text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">PDF Editor Lite</h1>
          <p className="mt-2 text-sm text-[#666]">
            Add flattened text, shapes, image overlays, signatures, and date stamps without turning this into a full layout editor.
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
          <h1 className="text-2xl font-bold text-[#1a1a1a]">PDF Editor Lite</h1>
          <p className="mt-2 text-sm text-[#666]">
            Exports are flattened page overlays. Use the workspace version when you need deliberate document finishing, not collaborative editing.
          </p>
        </div>

        <label className="block text-sm font-medium text-[#1a1a1a]">
          Text block
          <input
            className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Font
            <select
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={fontFamily}
              onChange={(event) => setFontFamily(event.target.value as "helvetica" | "times")}
            >
              <option value="helvetica">Helvetica</option>
              <option value="times">Times</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-[#1a1a1a]">
            Size
            <input
              type="number"
              min={10}
              max={32}
              className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
              value={fontSize}
              onChange={(event) => setFontSize(Math.max(10, Number(event.target.value) || 16))}
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => setMode({ type: "text" })}>
            Place text
          </Button>
          <Button variant="secondary" onClick={() => setMode({ type: "date" })}>
            Place date stamp
          </Button>
        </div>

        <div className="rounded-xl border border-[#eee] bg-[#fafafa] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[#1a1a1a]">
              Shape
              <select
                className="mt-1 w-full rounded-lg border border-[#d0d0d0] px-3 py-2 text-sm"
                value={shapeType}
                onChange={(event) => setShapeType(event.target.value as PdfEditorShapeType)}
              >
                <option value="rectangle">Rectangle</option>
                <option value="ellipse">Ellipse</option>
                <option value="line">Line</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-[#1a1a1a]">
              Fill color
              <input
                type="color"
                className="mt-1 h-10 w-full rounded-lg border border-[#d0d0d0] bg-white px-2"
                value={fillColor}
                onChange={(event) => setFillColor(event.target.value)}
              />
            </label>
          </div>
          <Button className="mt-3 w-full" variant="secondary" onClick={() => setMode({ type: "shape" })}>
            Place shape
          </Button>
        </div>

        <div className="rounded-xl border border-[#eee] bg-[#fafafa] p-4">
          <p className="text-sm font-medium text-[#1a1a1a]">Image overlays</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => imageInputRef.current?.click()}>
              Upload overlay image
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(event) => void handleImageSelect(event.target.files)}
            />
            <Button variant="secondary" onClick={() => setMode({ type: "signature", dataUrl: savedSignatures[0] ?? "" })} disabled={savedSignatures.length === 0}>
              Use latest signature
            </Button>
          </div>
          <div className="mt-3">
            <SignatureCanvas onSave={handleSignatureSave} />
          </div>
          {savedSignatures.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {savedSignatures.map((signature, index) => (
                <button
                  key={`${signature}-${index}`}
                  className="rounded-xl border border-[#ddd] bg-white p-2"
                  onClick={() => setMode({ type: "signature", dataUrl: signature })}
                >
                  <img src={signature} alt={`Saved signature ${index + 1}`} className="h-10 w-28 object-contain" />
                </button>
              ))}
              <button
                className="text-sm text-[#8b1a1a]"
                onClick={() => {
                  clearSavedSignatures(orgScope);
                  setSavedSignatures([]);
                }}
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="rounded-xl border border-[#eee] bg-[#fafafa] px-4 py-3 text-sm text-[#555]">
          Click the preview to place the selected object. You can delete any placed item before export.
        </div>

        <Button onClick={handleGenerate} disabled={objects.length === 0 || generating}>
          {generating ? "Exporting..." : "Export edited PDF"}
        </Button>
      </div>

      <PdfPagePreviewPanel
        pages={pages}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        overlay={
          <div
            className={`absolute inset-0 ${mode.type !== "none" ? "cursor-crosshair" : ""}`}
            onClick={handlePagePlacement}
          >
            {currentObjects.map((object) => (
              <div key={object.id}>
                {object.type === "text" ||
                object.type === "date" ||
                object.type === "initials" ? (
                  <button
                    className="absolute rounded border border-dashed border-[#777] bg-white/75 px-1 py-0.5 text-left"
                    style={{
                      left: `${object.x * 100}%`,
                      top: `${object.y * 100}%`,
                      color: object.color,
                      fontSize: `${Math.max(object.fontSize * 0.7, 10)}px`,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setObjects((current) => current.filter((item) => item.id !== object.id));
                    }}
                  >
                    {object.text}
                  </button>
                ) : object.type === "shape" ? (
                  <button
                    className="absolute border-2 border-dashed"
                    style={{
                      left: `${object.x * 100}%`,
                      top: `${object.y * 100}%`,
                      width: `${object.width * 100}%`,
                      height: `${object.height * 100}%`,
                      borderColor: object.strokeColor,
                      backgroundColor: `${object.fillColor ?? "#ffffff"}55`,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setObjects((current) => current.filter((item) => item.id !== object.id));
                    }}
                  />
                ) : object.type === "image" || object.type === "signature" ? (
                  <button
                    className="absolute rounded border border-dashed border-[#777] bg-white/70 p-1"
                    style={{
                      left: `${object.x * 100}%`,
                      top: `${object.y * 100}%`,
                      width: `${object.width * 100}%`,
                      height: `${object.height * 100}%`,
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                      setObjects((current) => current.filter((item) => item.id !== object.id));
                    }}
                  >
                    <img src={object.dataUrl} alt={object.type} className="h-full w-full object-contain" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        }
      />
    </div>
  );
}
