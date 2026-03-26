"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VoucherDocumentFrame } from "@/features/voucher/components/voucher-document-frame";
import { voucherDocumentSchema } from "@/features/voucher/schema";
import type { VoucherDocument } from "@/features/voucher/types";

function readVoucherDocumentFromWindowName() {
  if (typeof window === "undefined" || !window.name) {
    return null;
  }

  try {
    const payload = JSON.parse(window.name) as { document?: unknown };
    const parsed = voucherDocumentSchema.safeParse(payload.document ?? payload);

    if (!parsed.success) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

export function VoucherPrintSurface() {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "export" ? "export" : "print";
  const autoPrint = searchParams.get("autoprint") === "1";
  const [documentData, setDocumentData] = useState<VoucherDocument | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDocumentData(readVoucherDocumentFromWindowName());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!documentData) {
      return;
    }

    document.title = `${documentData.title} ${documentData.voucherNumber}`;

    if (mode !== "print" || !autoPrint) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [autoPrint, documentData, mode]);

  const bodyClasses = useMemo(
    () =>
      mode === "export"
        ? "min-h-screen bg-white p-0"
        : "min-h-screen bg-white px-4 py-6 md:px-8 md:py-10",
    [mode],
  );

  if (!documentData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
            Voucher render
          </p>
          <h1 className="mt-4 text-3xl text-[var(--foreground)]">
            Render payload unavailable
          </h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted-foreground)]">
            Open this page through the voucher workspace so the normalized document
            payload can be passed into the print surface.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={bodyClasses}>
      <div className={mode === "export" ? "mx-auto w-fit" : "mx-auto w-fit rounded-[1.5rem] border border-[rgba(29,23,16,0.08)] bg-white shadow-[0_24px_48px_rgba(38,30,20,0.08)]"}>
        <VoucherDocumentFrame document={documentData} mode="print" />
      </div>
    </main>
  );
}
