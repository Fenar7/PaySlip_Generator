"use client";

import { useEffect } from "react";

type VoucherPrintEffectsProps = {
  title: string;
  autoPrint: boolean;
};

export function VoucherPrintEffects({
  title,
  autoPrint,
}: VoucherPrintEffectsProps) {
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
