"use client";

import { useEffect } from "react";

type SalarySlipPrintEffectsProps = {
  title: string;
  autoPrint: boolean;
};

export function SalarySlipPrintEffects({
  title,
  autoPrint,
}: SalarySlipPrintEffectsProps) {
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
