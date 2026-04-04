"use client";

import { useState, useEffect, useCallback } from "react";
import { getOrgsForUser, type OrgWithRole } from "@/app/app/actions/org-actions";
import { useSupabaseSession } from "./use-supabase-session";

const ACTIVE_ORG_KEY = "slipwise_active_org_id";

export function useActiveOrg() {
  const { user } = useSupabaseSession();
  const [orgs, setOrgs] = useState<OrgWithRole[]>([]);
  const [activeOrg, setActiveOrgState] = useState<OrgWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    getOrgsForUser(user.id).then((userOrgs) => {
      setOrgs(userOrgs);
      const storedId =
        typeof window !== "undefined"
          ? localStorage.getItem(ACTIVE_ORG_KEY)
          : null;
      const active =
        userOrgs.find((o) => o.id === storedId) ?? userOrgs[0] ?? null;
      setActiveOrgState(active);
      setIsLoading(false);
    });
  }, [user?.id]);

  const setActiveOrg = useCallback((org: OrgWithRole) => {
    setActiveOrgState(org);
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_ORG_KEY, org.id);
    }
  }, []);

  return { activeOrg, orgs, setActiveOrg, isLoading };
}
