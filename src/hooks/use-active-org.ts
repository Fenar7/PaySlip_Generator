"use client";

import { useState, useEffect, useCallback } from "react";
import type { OrgWithRole } from "@/app/app/actions/org-actions";
import { useSupabaseSession } from "./use-supabase-session";

interface OrgListResponse {
  orgs: Array<{
    orgId: string;
    name: string;
    slug: string;
    role: string;
    joinedAt: string;
  }>;
  activeOrgId: string | null;
}

export function useActiveOrg() {
  const { user, isPending } = useSupabaseSession();
  // null = not yet fetched, [] = fetched but empty
  const [orgs, setOrgs] = useState<OrgWithRole[] | null>(null);
  const [activeOrg, setActiveOrgState] = useState<OrgWithRole | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Active org must come from the same server-side preference the auth context
    // uses, otherwise settings pages can render a different org than the server
    // will authorize.
    fetch("/api/org/list")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: OrgListResponse | null) => {
        const mappedOrgs: OrgWithRole[] = (data?.orgs ?? []).map((o) => ({
          id: o.orgId,
          name: o.name,
          slug: o.slug,
          logo: null,
          role: o.role,
        }));
        setOrgs(mappedOrgs);
        const serverActive =
          mappedOrgs.find((o) => o.id === data?.activeOrgId) ?? mappedOrgs[0] ?? null;
        setActiveOrgState(serverActive);
      })
      .catch(() => {
        setOrgs([]);
        setActiveOrgState(null);
      });
  }, [user?.id]);

  const setActiveOrg = useCallback((org: OrgWithRole) => {
    setActiveOrgState(org);
  }, []);

  // Loading while session is resolving, or user is set but orgs not yet fetched
  const isLoading = isPending || (!!user?.id && orgs === null);

  return { activeOrg, orgs: orgs ?? [], setActiveOrg, isLoading };
}
