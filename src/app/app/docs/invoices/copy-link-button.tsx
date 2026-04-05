"use client";

import { useState } from "react";

export function CopyInvoiceLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/invoice/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="text-sm text-blue-600 hover:text-blue-800"
    >
      {copied ? "Copied!" : "Copy Link"}
    </button>
  );
}
