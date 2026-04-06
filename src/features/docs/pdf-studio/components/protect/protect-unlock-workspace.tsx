"use client";

import { useCallback, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { downloadPdfBytes } from "@/features/docs/pdf-studio/utils/zip-builder";

// ── Types ──────────────────────────────────────────────────────────────

type ActiveTab = "protect" | "unlock";

interface ProtectState {
  file: File | null;
  userPassword: string;
  userPasswordConfirm: string;
  ownerPassword: string;
  permissions: {
    printing: boolean;
    copying: boolean;
    modifying: boolean;
  };
  status: "idle" | "processing" | "done" | "error";
  error: string | null;
}

interface UnlockState {
  file: File | null;
  pdfBytes: Uint8Array | null;
  needsPassword: boolean | null;
  password: string;
  status: "idle" | "detecting" | "unlocking" | "done" | "error";
  error: string | null;
}

// ── Component ──────────────────────────────────────────────────────────

export function ProtectUnlockWorkspace() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("protect");

  // Protect state
  const [protect, setProtect] = useState<ProtectState>({
    file: null,
    userPassword: "",
    userPasswordConfirm: "",
    ownerPassword: "",
    permissions: { printing: true, copying: true, modifying: true },
    status: "idle",
    error: null,
  });

  // Unlock state
  const [unlock, setUnlock] = useState<UnlockState>({
    file: null,
    pdfBytes: null,
    needsPassword: null,
    password: "",
    status: "idle",
    error: null,
  });

  const protectFileRef = useRef<HTMLInputElement>(null);
  const unlockFileRef = useRef<HTMLInputElement>(null);

  // ── Protect handlers ─────────────────────────────────────────────────

  const handleProtectFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f || f.type !== "application/pdf") return;
      setProtect((prev) => ({
        ...prev,
        file: f,
        status: "idle",
        error: null,
      }));
    },
    [],
  );

  const handleProtect = useCallback(async () => {
    if (!protect.file) return;

    if (!protect.userPassword) {
      setProtect((prev) => ({
        ...prev,
        error: "User password is required.",
      }));
      return;
    }
    if (protect.userPassword !== protect.userPasswordConfirm) {
      setProtect((prev) => ({
        ...prev,
        error: "Passwords do not match.",
      }));
      return;
    }
    if (protect.userPassword.length < 4) {
      setProtect((prev) => ({
        ...prev,
        error: "Password must be at least 4 characters.",
      }));
      return;
    }

    setProtect((prev) => ({ ...prev, status: "processing", error: null }));

    try {
      const arrayBuffer = await protect.file.arrayBuffer();
      const pdfBytes = new Uint8Array(arrayBuffer);

      const formData = new FormData();
      formData.append(
        "pdf",
        new Blob([pdfBytes], { type: "application/octet-stream" }),
        "document.pdf",
      );
      formData.append(
        "options",
        JSON.stringify({
          userPassword: protect.userPassword,
          ownerPassword: protect.ownerPassword || undefined,
          permissions: {
            printing: protect.permissions.printing,
            copying: protect.permissions.copying,
            modifying: protect.permissions.modifying,
          },
        }),
      );

      const response = await fetch("/api/pdf/encrypt", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 429)
          throw new Error("Too many requests. Please wait and try again.");
        if (response.status === 413)
          throw new Error("PDF is too large to encrypt.");
        throw new Error("Encryption failed. Please try again.");
      }

      const encryptedBuffer = await response.arrayBuffer();
      const encryptedBytes = new Uint8Array(encryptedBuffer);
      const baseName = protect.file.name.replace(/\.pdf$/i, "");
      downloadPdfBytes(encryptedBytes, `${baseName}-protected.pdf`);

      setProtect((prev) => ({ ...prev, status: "done" }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setProtect((prev) => ({ ...prev, status: "error", error: msg }));
    }
  }, [protect]);

  // ── Unlock handlers ──────────────────────────────────────────────────

  const handleUnlockFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f || f.type !== "application/pdf") return;

      setUnlock((prev) => ({
        ...prev,
        file: f,
        pdfBytes: null,
        needsPassword: null,
        password: "",
        status: "detecting",
        error: null,
      }));

      try {
        const arrayBuffer = await f.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // Try loading without password to detect if protected
        try {
          await PDFDocument.load(bytes, { ignoreEncryption: true });
          // If successful, check if it's actually encrypted by trying a proper load
          try {
            await PDFDocument.load(bytes);
            setUnlock((prev) => ({
              ...prev,
              pdfBytes: bytes,
              needsPassword: false,
              status: "idle",
            }));
          } catch {
            setUnlock((prev) => ({
              ...prev,
              pdfBytes: bytes,
              needsPassword: true,
              status: "idle",
            }));
          }
        } catch {
          setUnlock((prev) => ({
            ...prev,
            pdfBytes: bytes,
            needsPassword: true,
            status: "idle",
          }));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setUnlock((prev) => ({
          ...prev,
          status: "error",
          error: `Failed to read PDF: ${msg}`,
        }));
      }
    },
    [],
  );

  const handleUnlock = useCallback(async () => {
    if (!unlock.pdfBytes || !unlock.password) {
      setUnlock((prev) => ({
        ...prev,
        error: "Please enter the password.",
      }));
      return;
    }

    setUnlock((prev) => ({ ...prev, status: "unlocking", error: null }));

    try {
      // Verify password using pdfjs-dist (which supports password decryption)
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const pdf = await pdfjsLib.getDocument({
        data: unlock.pdfBytes,
        password: unlock.password,
      }).promise;

      // Re-create an unencrypted PDF by copying pages
      const newDoc = await PDFDocument.create();
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas context failed");
        await page.render({ canvas: null, canvasContext: ctx, viewport }).promise;

        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];
        const imgBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const pngImage = await newDoc.embedPng(imgBytes);

        const origViewport = page.getViewport({ scale: 1 });
        const newPage = newDoc.addPage([origViewport.width, origViewport.height]);
        newPage.drawImage(pngImage, {
          x: 0,
          y: 0,
          width: origViewport.width,
          height: origViewport.height,
        });
        canvas.remove();
      }

      const savedBytes = await newDoc.save();
      const baseName = unlock.file?.name.replace(/\.pdf$/i, "") ?? "document";
      downloadPdfBytes(savedBytes, `${baseName}-unlocked.pdf`);

      setUnlock((prev) => ({ ...prev, status: "done" }));
    } catch {
      setUnlock((prev) => ({
        ...prev,
        status: "error",
        error: "Incorrect password or corrupted file. Please try again.",
      }));
    }
  }, [unlock.pdfBytes, unlock.password, unlock.file]);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#1a1a1a] sm:text-3xl">
          Protect &amp; Unlock
        </h1>
        <p className="mt-2 text-sm text-[#666]">
          Add password protection or remove it from PDFs
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex justify-center">
        <div className="flex rounded-xl bg-[#f5f5f5] p-1">
          {(["protect", "unlock"] as ActiveTab[]).map((tab) => (
            <button
              key={tab}
              className={cn(
                "rounded-lg px-6 py-2.5 text-sm font-medium capitalize transition-colors",
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
      </div>

      {/* Protect Tab */}
      {activeTab === "protect" && (
        <div className="rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
          {/* File upload */}
          {!protect.file ? (
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e5e5e5] px-6 py-12 text-center transition-colors hover:border-[#999]"
              onClick={() => protectFileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  protectFileRef.current?.click();
              }}
            >
              <svg
                className="mb-3 h-10 w-10 text-[#999]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <p className="text-sm font-medium text-[#1a1a1a]">
                Upload a PDF to protect
              </p>
              <p className="mt-1 text-xs text-[#666]">
                Click to select a PDF file
              </p>
              <input
                ref={protectFileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleProtectFileSelect}
              />
            </div>
          ) : (
            <div className="space-y-5">
              {/* File info */}
              <div className="flex items-center justify-between rounded-xl bg-[#f5f5f5] px-4 py-3">
                <div className="flex items-center gap-3">
                  <svg
                    className="h-5 w-5 text-[#666]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-[#1a1a1a] truncate max-w-[200px]">
                    {protect.file.name}
                  </span>
                </div>
                <button
                  className="text-xs text-[#666] hover:text-red-600"
                  onClick={() =>
                    setProtect((prev) => ({
                      ...prev,
                      file: null,
                      status: "idle",
                      error: null,
                    }))
                  }
                >
                  Remove
                </button>
              </div>

              {/* Password fields */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#1a1a1a]">
                  User Password *
                </label>
                <input
                  type="password"
                  value={protect.userPassword}
                  onChange={(e) =>
                    setProtect((prev) => ({
                      ...prev,
                      userPassword: e.target.value,
                      error: null,
                    }))
                  }
                  className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#999] focus:border-[#999] focus:outline-none"
                  placeholder="Required — needed to open the PDF"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#1a1a1a]">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={protect.userPasswordConfirm}
                  onChange={(e) =>
                    setProtect((prev) => ({
                      ...prev,
                      userPasswordConfirm: e.target.value,
                      error: null,
                    }))
                  }
                  className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#999] focus:border-[#999] focus:outline-none"
                  placeholder="Re-enter your password"
                />
              </div>
              <div>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-[#1a1a1a]">
                    Owner Password
                  </label>
                  <span
                    className="cursor-help text-[#999]"
                    title="The owner password grants full access including editing permissions. If not set, the user password is used for both."
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                </div>
                <input
                  type="password"
                  value={protect.ownerPassword}
                  onChange={(e) =>
                    setProtect((prev) => ({
                      ...prev,
                      ownerPassword: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#999] focus:border-[#999] focus:outline-none"
                  placeholder="Optional — for full access"
                />
              </div>

              {/* Permissions */}
              <div>
                <p className="mb-3 text-xs font-semibold text-[#1a1a1a]">
                  Permissions
                </p>
                <div className="space-y-3">
                  {(
                    [
                      {
                        key: "printing" as const,
                        label: "Allow Printing",
                      },
                      {
                        key: "copying" as const,
                        label: "Allow Copying Text",
                      },
                      {
                        key: "modifying" as const,
                        label: "Allow Modifying",
                      },
                    ] as const
                  ).map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        checked={protect.permissions[key]}
                        onChange={(e) =>
                          setProtect((prev) => ({
                            ...prev,
                            permissions: {
                              ...prev.permissions,
                              [key]: e.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 rounded border-[#e5e5e5] accent-[#1a1a1a]"
                      />
                      <span className="text-sm text-[#1a1a1a]">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Error */}
              {protect.error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {protect.error}
                </div>
              )}

              {/* Success */}
              {protect.status === "done" && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  PDF protected and downloaded successfully!
                </div>
              )}

              {/* Action */}
              <Button
                className="w-full"
                onClick={handleProtect}
                disabled={protect.status === "processing"}
              >
                {protect.status === "processing"
                  ? "Encrypting…"
                  : "Protect & Download"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Unlock Tab */}
      {activeTab === "unlock" && (
        <div className="rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-sm">
          {!unlock.file ? (
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#e5e5e5] px-6 py-12 text-center transition-colors hover:border-[#999]"
              onClick={() => unlockFileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  unlockFileRef.current?.click();
              }}
            >
              <svg
                className="mb-3 h-10 w-10 text-[#999]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm font-medium text-[#1a1a1a]">
                Upload a protected PDF
              </p>
              <p className="mt-1 text-xs text-[#666]">
                Remove password protection from your PDF
              </p>
              <input
                ref={unlockFileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleUnlockFileSelect}
              />
            </div>
          ) : (
            <div className="space-y-5">
              {/* File info */}
              <div className="flex items-center justify-between rounded-xl bg-[#f5f5f5] px-4 py-3">
                <div className="flex items-center gap-3">
                  <svg
                    className="h-5 w-5 text-[#666]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-[#1a1a1a] truncate max-w-[200px]">
                    {unlock.file.name}
                  </span>
                  {unlock.needsPassword !== null && (
                    <Badge variant={unlock.needsPassword ? "warning" : "success"}>
                      {unlock.needsPassword ? "Protected" : "Not Protected"}
                    </Badge>
                  )}
                </div>
                <button
                  className="text-xs text-[#666] hover:text-red-600"
                  onClick={() =>
                    setUnlock({
                      file: null,
                      pdfBytes: null,
                      needsPassword: null,
                      password: "",
                      status: "idle",
                      error: null,
                    })
                  }
                >
                  Remove
                </button>
              </div>

              {unlock.status === "detecting" && (
                <div className="text-center text-sm text-[#666]">
                  Analyzing PDF…
                </div>
              )}

              {unlock.needsPassword === false && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  This PDF does not appear to be password-protected.
                </div>
              )}

              {unlock.needsPassword && (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-[#1a1a1a]">
                      Enter Password
                    </label>
                    <input
                      type="password"
                      value={unlock.password}
                      onChange={(e) =>
                        setUnlock((prev) => ({
                          ...prev,
                          password: e.target.value,
                          error: null,
                        }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUnlock();
                      }}
                      className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3.5 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#999] focus:border-[#999] focus:outline-none"
                      placeholder="PDF password"
                    />
                  </div>

                  {unlock.error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {unlock.error}
                    </div>
                  )}

                  {unlock.status === "done" && (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                      PDF unlocked and downloaded successfully!
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleUnlock}
                    disabled={
                      unlock.status === "unlocking" || !unlock.password
                    }
                  >
                    {unlock.status === "unlocking"
                      ? "Unlocking…"
                      : "Unlock & Download"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
