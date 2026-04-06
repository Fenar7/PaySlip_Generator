"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Plus, Building2 } from "lucide-react";

interface OrgItem {
  orgId: string;
  name: string;
  slug: string;
  role: string;
}

export function OrgSwitcher() {
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/org/list");
      if (!res.ok) return;
      const data = await res.json();
      setOrgs(data.orgs ?? []);
      setActiveOrgId(data.activeOrgId);
    } catch {
      // Silently fail — org list is non-critical for rendering
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSwitch(orgId: string) {
    if (orgId === activeOrgId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      const res = await fetch("/api/org/switch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeOrgId: orgId }),
      });
      if (res.ok) {
        setActiveOrgId(orgId);
        setOpen(false);
        window.location.reload();
      }
    } catch {
      // Switch failed
    } finally {
      setSwitching(false);
    }
  }

  const activeOrg = orgs.find((o) => o.orgId === activeOrgId);

  if (orgs.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={switching}
        className="flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-soft)]"
      >
        <Building2 className="h-4 w-4 text-[#666]" />
        <span className="font-medium text-[#1a1a1a] max-w-[160px] truncate">
          {activeOrg?.name ?? "Select Organization"}
        </span>
        {activeOrg && (
          <Badge variant="default">{activeOrg.role}</Badge>
        )}
        <ChevronDown className="h-3 w-3 text-[#666]" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-[var(--border-strong)] bg-white shadow-lg">
          <div className="p-1">
            {orgs.map((org) => (
              <button
                key={org.orgId}
                onClick={() => handleSwitch(org.orgId)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  org.orgId === activeOrgId
                    ? "bg-[var(--surface-soft)] font-medium"
                    : "hover:bg-[var(--surface-soft)]"
                }`}
              >
                <span className="truncate text-[#1a1a1a]">{org.name}</span>
                <Badge variant="default">{org.role}</Badge>
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--border-soft)] p-1">
            <a
              href="/onboarding"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#666] hover:bg-[var(--surface-soft)] hover:text-[#1a1a1a] transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create New Organization
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
