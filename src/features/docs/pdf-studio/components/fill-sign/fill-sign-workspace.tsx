"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useActiveOrg } from "@/hooks/use-active-org";
import { SignatureCanvas } from "./signature-canvas";
import {
  getSavedSignatures,
  saveSignature,
  clearSavedSignatures,
} from "@/features/docs/pdf-studio/utils/signature";
import {
  embedAnnotations,
  type TextAnnotation,
  type SignatureAnnotation,
} from "@/features/docs/pdf-studio/utils/annotation-writer";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

// ── Types ──────────────────────────────────────────────────────────────

type SidebarTab = "signature" | "text";

interface PagePreview {
  pageIndex: number;
  dataUrl: string;
  widthPt: number;
  heightPt: number;
}

type PlacingMode =
  | { type: "none" }
  | { type: "signature"; dataUrl: string }
  | { type: "text" };

// ── Component ──────────────────────────────────────────────────────────

export function FillSignWorkspace() {
  const { activeOrg, isLoading: isOrgLoading } = useActiveOrg();
  const orgScope = activeOrg?.id ?? "anonymous";
  // PDF state
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pages, setPages] = useState<PagePreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  // Annotations
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [signatureAnnotations, setSignatureAnnotations] = useState<
    SignatureAnnotation[]
  >([]);

  // Sidebar state
  const [activeTab, setActiveTab] = useState<SidebarTab>("signature");
  const [penColor, setPenColor] = useState("#000000");
  const [savedSigs, setSavedSigs] = useState<string[]>([]);

  // Text tool state
  const [newText, setNewText] = useState("Text");
  const [newFontSize, setNewFontSize] = useState(12);
  const [newTextColor, setNewTextColor] = useState<"black" | "blue" | "red">(
    "black",
  );

  // Placing mode
  const [placingMode, setPlacingMode] = useState<PlacingMode>({
    type: "none",
  });

  // Download state
  const [generating, setGenerating] = useState(false);

  // Dragging
  const [dragging, setDragging] = useState<{
    id: string;
    type: "text" | "signature";
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const pageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved signatures on mount
  useEffect(() => {
    if (isOrgLoading) {
      return;
    }

    setSavedSigs(getSavedSignatures(orgScope));
  }, [orgScope, isOrgLoading]);

  // ── File upload ──────────────────────────────────────────────────────

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f || f.type !== "application/pdf") {
        setError("Please select a valid PDF file.");
        return;
      }

      setLoading(true);
      setError(null);
      setFile(f);
      setTextAnnotations([]);
      setSignatureAnnotations([]);
      setCurrentPage(0);

      try {
        const arrayBuffer = await f.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        setPdfBytes(bytes);

        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
        if (pdf.numPages > 50) {
          setError("PDF exceeds 50 pages limit.");
          setLoading(false);
          return;
        }

        const previews: PagePreview[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 150 / 72 });
          const canvas = document.createElement("canvas");
          try {
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context failed");
            await page.render({ canvas: null, canvasContext: ctx, viewport }).promise;

            const originalVp = page.getViewport({ scale: 1 });
            previews.push({
              pageIndex: i - 1,
              dataUrl: canvas.toDataURL("image/jpeg", 0.85),
              widthPt: originalVp.width,
              heightPt: originalVp.height,
            });
          } finally {
            canvas.width = 0;
            canvas.height = 0;
            canvas.remove();
            page.cleanup();
          }
        }

        await pdf.destroy();

        setPages(previews);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to read PDF: ${msg}`);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ── Signature actions ────────────────────────────────────────────────

  const handleSignatureSave = useCallback((dataUrl: string) => {
    saveSignature(dataUrl, orgScope);
    setSavedSigs(getSavedSignatures(orgScope));
    setPlacingMode({ type: "signature", dataUrl });
  }, [orgScope]);

  const handleUseSavedSignature = useCallback((dataUrl: string) => {
    setPlacingMode({ type: "signature", dataUrl });
  }, []);

  const handleClearSaved = useCallback(() => {
    clearSavedSignatures(orgScope);
    setSavedSigs([]);
  }, [orgScope]);

  // ── Page click for placing ──────────────────────────────────────────

  const handlePageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (placingMode.type === "none" || !pageContainerRef.current) return;

      const rect = pageContainerRef.current.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width;
      const relY = (e.clientY - rect.top) / rect.height;

      if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return;

      if (placingMode.type === "signature") {
        const sigW = 0.25;
        const sigH = 0.08;
        const ann: SignatureAnnotation = {
          id: `sig-${Date.now()}`,
          dataUrl: placingMode.dataUrl,
          pageIndex: currentPage,
          x: Math.min(relX, 1 - sigW),
          y: Math.min(relY, 1 - sigH),
          width: sigW,
          height: sigH,
        };
        setSignatureAnnotations((prev) => [...prev, ann]);
        setPlacingMode({ type: "none" });
      } else if (placingMode.type === "text") {
        const ann: TextAnnotation = {
          id: `txt-${Date.now()}`,
          text: newText || "Text",
          pageIndex: currentPage,
          x: Math.min(relX, 0.9),
          y: Math.min(relY, 0.95),
          fontSize: newFontSize,
          color: newTextColor,
        };
        setTextAnnotations((prev) => [...prev, ann]);
        setPlacingMode({ type: "none" });
      }
    },
    [placingMode, currentPage, newText, newFontSize, newTextColor],
  );

  // ── Drag support ─────────────────────────────────────────────────────

  const handleAnnotationMouseDown = useCallback(
    (
      e: React.MouseEvent,
      id: string,
      type: "text" | "signature",
      origX: number,
      origY: number,
    ) => {
      e.stopPropagation();
      setDragging({
        id,
        type,
        startX: e.clientX,
        startY: e.clientY,
        origX,
        origY,
      });
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;
    const container = pageContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragging.startX) / rect.width;
      const dy = (e.clientY - dragging.startY) / rect.height;
      const newX = Math.max(0, Math.min(1, dragging.origX + dx));
      const newY = Math.max(0, Math.min(1, dragging.origY + dy));

      if (dragging.type === "text") {
        setTextAnnotations((prev) =>
          prev.map((a) =>
            a.id === dragging.id ? { ...a, x: newX, y: newY } : a,
          ),
        );
      } else {
        setSignatureAnnotations((prev) =>
          prev.map((a) =>
            a.id === dragging.id ? { ...a, x: newX, y: newY } : a,
          ),
        );
      }
    };

    const handleMouseUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  // ── Delete annotation ────────────────────────────────────────────────

  const deleteTextAnnotation = useCallback((id: string) => {
    setTextAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const deleteSignatureAnnotation = useCallback((id: string) => {
    setSignatureAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ── Download ─────────────────────────────────────────────────────────

  const handleDownload = useCallback(async () => {
    if (!pdfBytes || !file) return;
    setGenerating(true);
    try {
      const result = await embedAnnotations(
        pdfBytes,
        textAnnotations,
        signatureAnnotations,
      );
      const baseName = file.name.replace(/\.pdf$/i, "");
      downloadPdfBytes(result, `${baseName}-signed.pdf`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to generate PDF: ${msg}`);
    } finally {
      setGenerating(false);
    }
  }, [pdfBytes, file, textAnnotations, signatureAnnotations]);

  // ── Current page annotations ─────────────────────────────────────────

  const currentTextAnns = useMemo(
    () => textAnnotations.filter((a) => a.pageIndex === currentPage),
    [textAnnotations, currentPage],
  );
  const currentSigAnns = useMemo(
    () => signatureAnnotations.filter((a) => a.pageIndex === currentPage),
    [signatureAnnotations, currentPage],
  );

  const totalAnnotations = textAnnotations.length + signatureAnnotations.length;

  // ── Pen color options ────────────────────────────────────────────────

  const penColors = [
    { value: "#000000", label: "Black" },
    { value: "#1a3a5c", label: "Dark Blue" },
    { value: "#8b1a1a", label: "Dark Red" },
  ];

  // ── Render ───────────────────────────────────────────────────────────

  if (!file || pages.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">
            Fill &amp; Sign
          </h1>
          <p className="mt-2 text-sm text-[#666]">
            Add text and signatures to any PDF document
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5e5e5] bg-white px-6 py-16 text-center transition-colors hover:border-[#999]",
            loading && "pointer-events-none opacity-60",
          )}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              fileInputRef.current?.click();
          }}
        >
          <svg
            className="mb-4 h-12 w-12 text-[#999]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <p className="text-sm font-medium text-[#1a1a1a]">
            {loading ? "Loading PDF…" : "Click to upload a PDF"}
          </p>
          <p className="mt-1 text-xs text-[#666]">Up to 50 pages</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    );
  }

  const currentPreview = pages[currentPage];

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col lg:flex-row">
      {/* Sidebar */}
      <div className="w-full shrink-0 overflow-y-auto border-b border-[#e5e5e5] bg-white p-4 lg:w-80 lg:border-b-0 lg:border-r">
        <h2 className="mb-4 text-lg font-bold text-[#1a1a1a]">
          Fill &amp; Sign
        </h2>

        {/* Tabs */}
        <div className="mb-4 flex rounded-xl bg-[#f5f5f5] p-1">
          {(["signature", "text"] as SidebarTab[]).map((tab) => (
            <button
              key={tab}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-medium capitalize transition-colors",
                activeTab === tab
                  ? "bg-white text-[#1a1a1a] shadow-sm"
                  : "text-[#666] hover:text-[#1a1a1a]",
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Signature Tab */}
        {activeTab === "signature" && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-[#1a1a1a]">
                Pen Color
              </p>
              <div className="flex gap-2">
                {penColors.map((c) => (
                  <button
                    key={c.value}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all",
                      penColor === c.value
                        ? "border-[#1a1a1a] scale-110"
                        : "border-[#e5e5e5]",
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                    onClick={() => setPenColor(c.value)}
                  />
                ))}
              </div>
            </div>

            <SignatureCanvas
              onSave={handleSignatureSave}
              penColor={penColor}
            />

            {placingMode.type === "signature" && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Click on the document to place your signature
              </div>
            )}

            {savedSigs.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#1a1a1a]">
                    Saved Signatures
                  </p>
                  <button
                    className="text-xs text-[#666] hover:text-red-600"
                    onClick={handleClearSaved}
                  >
                    Clear all
                  </button>
                </div>
                <div className="space-y-2">
                  {savedSigs.map((sig, idx) => (
                    <button
                      key={idx}
                      className="block w-full rounded-xl border border-[#e5e5e5] bg-white p-2 transition-colors hover:border-[#999]"
                      onClick={() => handleUseSavedSignature(sig)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={sig}
                        alt={`Saved signature ${idx + 1}`}
                        className="h-10 w-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text Tab */}
        {activeTab === "text" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#1a1a1a]">
                Text Content
              </label>
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus:border-[#999] focus:outline-none"
                placeholder="Enter text…"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-semibold text-[#1a1a1a]">
                  Size
                </label>
                <select
                  value={newFontSize}
                  onChange={(e) => setNewFontSize(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus:border-[#999] focus:outline-none"
                >
                  {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24].map((s) => (
                    <option key={s} value={s}>
                      {s} pt
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-semibold text-[#1a1a1a]">
                  Color
                </label>
                <select
                  value={newTextColor}
                  onChange={(e) =>
                    setNewTextColor(
                      e.target.value as "black" | "blue" | "red",
                    )
                  }
                  className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#1a1a1a] focus:border-[#999] focus:outline-none"
                >
                  <option value="black">Black</option>
                  <option value="blue">Blue</option>
                  <option value="red">Red</option>
                </select>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => setPlacingMode({ type: "text" })}
            >
              Add Text
            </Button>
            {placingMode.type === "text" && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Click on the document to place text
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 space-y-3 border-t border-[#e5e5e5] pt-4">
          <div className="flex items-center justify-between text-xs text-[#666]">
            <span>Annotations</span>
            <Badge>{totalAnnotations}</Badge>
          </div>
          <Button
            className="w-full"
            disabled={totalAnnotations === 0 || generating}
            onClick={handleDownload}
          >
            {generating ? "Generating…" : "Download Signed PDF"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={() => {
              setFile(null);
              setPdfBytes(null);
              setPages([]);
              setTextAnnotations([]);
              setSignatureAnnotations([]);
              setCurrentPage(0);
              setPlacingMode({ type: "none" });
              setError(null);
            }}
          >
            Upload Different PDF
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[#f5f5f5]">
        {error && (
          <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Page navigation */}
        <div className="flex items-center justify-between border-b border-[#e5e5e5] bg-white px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            ← Prev
          </Button>
          <span className="text-xs text-[#666]">
            Page {currentPage + 1} of {pages.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentPage((p) => Math.min(pages.length - 1, p + 1))
            }
            disabled={currentPage >= pages.length - 1}
          >
            Next →
          </Button>
        </div>

        {/* Page canvas */}
        <div className="flex flex-1 items-start justify-center overflow-auto p-4 sm:p-8">
          <div
            ref={pageContainerRef}
            className={cn(
              "relative shadow-lg bg-white",
              placingMode.type !== "none" && "cursor-crosshair",
            )}
            onClick={handlePageClick}
            style={{
              width: "100%",
              maxWidth: 700,
              aspectRatio: `${currentPreview.widthPt} / ${currentPreview.heightPt}`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPreview.dataUrl}
              alt={`Page ${currentPage + 1}`}
              className="pointer-events-none h-full w-full select-none"
              draggable={false}
            />

            {/* Text annotations */}
            {currentTextAnns.map((ann) => {
              const textColorMap = {
                black: "#000",
                blue: "#1a3a5c",
                red: "#8b1a1a",
              };
              return (
                <div
                  key={ann.id}
                  className="group absolute flex cursor-move items-start"
                  style={{
                    left: `${ann.x * 100}%`,
                    top: `${ann.y * 100}%`,
                    fontSize: `${ann.fontSize * 0.8}px`,
                    color: textColorMap[ann.color],
                  }}
                  onMouseDown={(e) =>
                    handleAnnotationMouseDown(e, ann.id, "text", ann.x, ann.y)
                  }
                >
                  <span className="whitespace-nowrap rounded border border-transparent px-0.5 group-hover:border-blue-400 group-hover:bg-blue-50/50">
                    {ann.text}
                  </span>
                  <button
                    className="ml-1 hidden h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-500 text-[8px] text-white group-hover:flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTextAnnotation(ann.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            {/* Signature annotations */}
            {currentSigAnns.map((ann) => (
              <div
                key={ann.id}
                className="group absolute cursor-move"
                style={{
                  left: `${ann.x * 100}%`,
                  top: `${ann.y * 100}%`,
                  width: `${ann.width * 100}%`,
                  height: `${ann.height * 100}%`,
                }}
                onMouseDown={(e) =>
                  handleAnnotationMouseDown(
                    e,
                    ann.id,
                    "signature",
                    ann.x,
                    ann.y,
                  )
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={ann.dataUrl}
                  alt="Signature"
                  className="h-full w-full rounded border border-transparent object-contain group-hover:border-blue-400"
                  draggable={false}
                />
                <button
                  className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white shadow group-hover:flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSignatureAnnotation(ann.id);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
