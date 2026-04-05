"use client";

import { useState, useEffect, useCallback } from "react";
import { useActiveOrg } from "./use-active-org";
import {
  hasPermission as checkPermission,
  type Module,
  type Action,
} from "@/lib/permissions";

export function usePermissions() {
  const { activeOrg } = useActiveOrg();
  const role = activeOrg?.role ?? "viewer";

  const can = useCallback(
    (module: Module, action: Action): boolean => {
      return checkPermission(role, module, action);
    },
    [role]
  );

  return { role, can };
}
