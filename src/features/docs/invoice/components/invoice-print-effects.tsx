"use client";

import { useEffect } from "react";

type InvoicePrintEffectsProps = {
  title: string;
  autoPrint: boolean;
};

export function InvoicePrintEffects({
  title,
  autoPrint,
}: InvoicePrintEffectsProps) {
  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    if (!autoPrint) {
      return;
    }

    const timer = window.setTimeout(() => {
      window.print();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return null;
}
