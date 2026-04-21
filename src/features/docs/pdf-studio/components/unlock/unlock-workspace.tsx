"use client";

import { ProtectUnlockWorkspaceWithOptions } from "@/features/docs/pdf-studio/components/protect/protect-unlock-workspace";

export function UnlockWorkspace() {
  return (
    <ProtectUnlockWorkspaceWithOptions
      toolId="unlock"
      initialTab="unlock"
      lockToTab="unlock"
      title="Unlock PDF"
      description="Use the image-only unlock fallback when you need a readable copy and can accept flattened, lossy output."
    />
  );
}
