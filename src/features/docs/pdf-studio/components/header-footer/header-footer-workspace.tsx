"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  injectHeaderFooter,
  type HeaderFooterConfig,
  type HeaderFooterSettings,
} from "@/features/docs/pdf-studio/utils/header-footer-writer";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

// ── Defaults ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: HeaderFooterConfig = {
  left: "",
  center: "",
  right: "",
  fontSize: 10,
  fontFamily: "helvetica",
  color: "#000000",
  marginMm: 20,
};

const FONT_SIZES = [8, 9, 10, 11, 12, 13, 14];
const COLOR_PRESETS = [
  { value: "#000000", label: "Black" },
  { value: "#666666", label: "Gray" },
  { value: "#1a3a5c", label: "Blue" },
  { value: "#8b1a1a", label: "Red" },
  { value: "#1a5c2e", label: "Green" },
];
const TOKEN_BUTTONS = [
  { token: "{page}", label: "Page #" },
  { token: "{total}", label: "Total" },
  { token: "{date}", label: "Date" },
  { token: "{filename}", label: "Filename" },
];

// ── Component ──────────────────────────────────────────────────────────

export function HeaderFooterWorkspace() {
  const [file, setFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState({ width: 595, height: 842 }); // A4 default in pt
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState(false);

  const [header, setHeader] = useState<HeaderFooterConfig>({
    ...DEFAULT_CONFIG,
  });
  const [footer, setFooter] = useState<HeaderFooterConfig>({
    ...DEFAULT_CONFIG,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setSuccess(false);

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
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        setPageSize({ width: viewport.width, height: viewport.height });

        const previewViewport = page.getViewport({ scale: 150 / 72 });
        const canvas = document.createElement("canvas");
        canvas.width = previewViewport.width;
        canvas.height = previewViewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context failed");
        await page.render({ canvas: null, canvasContext: ctx, viewport: previewViewport })
          .promise;

        setPreviewUrl(canvas.toDataURL("image/jpeg", 0.85));
        canvas.remove();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to read PDF: ${msg}`);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ── Generate ─────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!pdfBytes || !file) return;
    setGenerating(true);
    setError(null);
    setSuccess(false);

    try {
      const settings: HeaderFooterSettings = {
        header,
        footer,
        filename: file.name.replace(/\.pdf$/i, ""),
      };
      const result = await injectHeaderFooter(pdfBytes, settings);
      const baseName = file.name.replace(/\.pdf$/i, "");
      downloadPdfBytes(result, `${baseName}-with-headers.pdf`);
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to generate PDF: ${msg}`);
    } finally {
      setGenerating(false);
    }
  }, [pdfBytes, file, header, footer]);

  const hasContent =
    header.left ||
    header.center ||
    header.right ||
    footer.left ||
    footer.center ||
    footer.right;

  // ── Config panel sub-component ───────────────────────────────────────

  function ConfigPanel({
    label,
    config,
    onChange,
    marginLabel,
  }: {
    label: string;
    config: HeaderFooterConfig;
    onChange: (cfg: HeaderFooterConfig) => void;
    marginLabel: string;
  }) {
    const insertToken = (
      position: "left" | "center" | "right",
      token: string,
    ) => {
      onChange({ ...config, [position]: config[position] + token });
    };

    return (
      <div className="space-y-4 rounded-xl border border-[#e5e5e5] bg-white p-4">
        <h3 className="text-sm font-bold text-[#1a1a1a]">{label}</h3>

        {/* Text inputs */}
        {(["left", "center", "right"] as const).map((pos) => (
          <div key={pos}>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold capitalize text-[#1a1a1a]">
                {pos} Text
              </label>
              <div className="flex gap-1">
                {TOKEN_BUTTONS.map((t) => (
                  <button
                    key={t.token}
                    className="rounded bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] text-[#666] transition-colors hover:bg-[#e5e5e5]"
                    onClick={() => insertToken(pos, t.token)}
                    title={`Insert ${t.token}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={config[pos]}
              onChange={(e) =>
                onChange({ ...config, [pos]: e.target.value })
              }
              className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#999] focus:border-[#999] focus:outline-none"
              placeholder={`${pos.charAt(0).toUpperCase() + pos.slice(1)} text…`}
            />
          </div>
        ))}

        {/* Font, Size, Color */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#1a1a1a]">
              Font
            </label>
            <select
              value={config.fontFamily}
              onChange={(e) =>
                onChange({
                  ...config,
                  fontFamily: e.target.value as "helvetica" | "times",
                })
              }
              className="w-full rounded-xl border border-[#e5e5e5] bg-white px-2 py-2 text-xs text-[#1a1a1a] focus:border-[#999] focus:outline-none"
            >
              <option value="helvetica">Helvetica</option>
              <option value="times">Times New Roman</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#1a1a1a]">
              Size
            </label>
            <select
              value={config.fontSize}
              onChange={(e) =>
                onChange({ ...config, fontSize: Number(e.target.value) })
              }
              className="w-full rounded-xl border border-[#e5e5e5] bg-white px-2 py-2 text-xs text-[#1a1a1a] focus:border-[#999] focus:outline-none"
            >
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} pt
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#1a1a1a]">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.color}
                onChange={(e) =>
                  onChange({ ...config, color: e.target.value })
                }
                className="h-8 w-8 cursor-pointer rounded border border-[#e5e5e5]"
              />
            </div>
          </div>
        </div>

        {/* Color presets */}
        <div className="flex gap-2">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c.value}
              className={cn(
                "h-6 w-6 rounded-full border-2 transition-all",
                config.color === c.value
                  ? "border-[#1a1a1a] scale-110"
                  : "border-[#e5e5e5]",
              )}
              style={{ backgroundColor: c.value }}
              title={c.label}
              onClick={() => onChange({ ...config, color: c.value })}
            />
          ))}
        </div>

        {/* Margin */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-xs font-semibold text-[#1a1a1a]">
              {marginLabel}
            </label>
            <span className="text-xs text-[#666]">{config.marginMm} mm</span>
          </div>
          <input
            type="range"
            min={10}
            max={50}
            value={config.marginMm}
            onChange={(e) =>
              onChange({ ...config, marginMm: Number(e.target.value) })
            }
            className="w-full accent-[#1a1a1a]"
          />
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────

  if (!file || !previewUrl) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">
            Header &amp; Footer
          </h1>
          <p className="mt-2 text-sm text-[#666]">
            Add custom headers and footers to all PDF pages
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
              d="M4 6h16M4 12h16M4 18h7"
            />
          </svg>
          <p className="text-sm font-medium text-[#1a1a1a]">
            {loading ? "Loading PDF…" : "Upload a PDF to add headers & footers"}
          </p>
          <p className="mt-1 text-xs text-[#666]">Click to select a PDF file</p>
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

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col lg:flex-row">
      {/* Settings panel */}
      <div className="w-full shrink-0 space-y-4 overflow-y-auto border-b border-[#e5e5e5] bg-[#fafafa] p-4 lg:w-[420px] lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1a1a1a]">
            Header &amp; Footer
          </h2>
          <button
            className="text-xs text-[#666] hover:text-red-600"
            onClick={() => {
              setFile(null);
              setPdfBytes(null);
              setPreviewUrl(null);
              setHeader({ ...DEFAULT_CONFIG });
              setFooter({ ...DEFAULT_CONFIG });
              setError(null);
              setSuccess(false);
            }}
          >
            Change PDF
          </button>
        </div>

        <div className="rounded-xl bg-[#f5f5f5] px-3 py-2 text-xs text-[#666] truncate">
          {file.name}
        </div>

        <ConfigPanel
          label="Header"
          config={header}
          onChange={setHeader}
          marginLabel="Top Margin"
        />

        <ConfigPanel
          label="Footer"
          config={footer}
          onChange={setFooter}
          marginLabel="Bottom Margin"
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            PDF generated and downloaded!
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleGenerate}
          disabled={!hasContent || generating}
        >
          {generating ? "Generating…" : "Generate & Download"}
        </Button>
      </div>

      {/* Preview area */}
      <div className="flex flex-1 items-start justify-center overflow-auto bg-[#f5f5f5] p-4 sm:p-8">
        <div
          className="relative bg-white shadow-lg"
          style={{
            width: "100%",
            maxWidth: 600,
            aspectRatio: `${pageSize.width} / ${pageSize.height}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Page preview"
            className="h-full w-full object-contain"
            draggable={false}
          />

          {/* Header overlay */}
          {(header.left || header.center || header.right) && (
            <div
              className="absolute left-0 right-0 flex items-center justify-between px-[6%] text-xs"
              style={{
                top: `${(header.marginMm * 2.835) / pageSize.height * 100}%`,
                fontSize: `${header.fontSize * 0.8}px`,
                color: header.color,
                fontFamily:
                  header.fontFamily === "times" ? "Times New Roman, serif" : "Helvetica, sans-serif",
              }}
            >
              <span>{header.left || ""}</span>
              <span>{header.center || ""}</span>
              <span>{header.right || ""}</span>
            </div>
          )}

          {/* Footer overlay */}
          {(footer.left || footer.center || footer.right) && (
            <div
              className="absolute left-0 right-0 flex items-center justify-between px-[6%] text-xs"
              style={{
                bottom: `${(footer.marginMm * 2.835) / pageSize.height * 100}%`,
                fontSize: `${footer.fontSize * 0.8}px`,
                color: footer.color,
                fontFamily:
                  footer.fontFamily === "times" ? "Times New Roman, serif" : "Helvetica, sans-serif",
              }}
            >
              <span>{footer.left || ""}</span>
              <span>{footer.center || ""}</span>
              <span>{footer.right || ""}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
