"use client";

import { useState, useEffect, useCallback } from "react";
import { getOrgsForUser, type OrgWithRole } from "@/app/app/actions/org-actions";
import { useSupabaseSession } from "./use-supabase-session";

const ACTIVE_ORG_KEY = "slipwise_active_org_id";

export function useActiveOrg() {
  const { user, isPending } = useSupabaseSession();
  // null = not yet fetched, [] = fetched but empty
  const [orgs, setOrgs] = useState<OrgWithRole[] | null>(null);
  const [activeOrg, setActiveOrgState] = useState<OrgWithRole | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    getOrgsForUser(user.id).then((userOrgs) => {
      setOrgs(userOrgs);
      const storedId =
        typeof window !== "undefined"
          ? localStorage.getItem(ACTIVE_ORG_KEY)
          : null;
      const active =
        userOrgs.find((o) => o.id === storedId) ?? userOrgs[0] ?? null;
      setActiveOrgState(active);
    });
  }, [user?.id]);

  const setActiveOrg = useCallback((org: OrgWithRole) => {
    setActiveOrgState(org);
    if (typeof window !== "undefined") {
      localStorage.setItem(ACTIVE_ORG_KEY, org.id);
    }
  }, []);

  // Loading while session is resolving, or user is set but orgs not yet fetched
  const isLoading = isPending || (!!user?.id && orgs === null);

  return { activeOrg, orgs: orgs ?? [], setActiveOrg, isLoading };
}
