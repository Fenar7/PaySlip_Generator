import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listOrgEntityGroups } from "./actions";
import { EntityGroupCreateForm } from "./entity-group-create-form";
import { AddEntityForm } from "./add-entity-form";

export const metadata: Metadata = { title: "Entity Groups | Settings" };

const ENTITY_TYPE_LABELS: Record<string, string> = {
  STANDALONE: "Standalone",
  HOLDING: "Holding",
  SUBSIDIARY: "Subsidiary",
  BRANCH: "Branch",
};

const ENTITY_TYPE_COLORS: Record<string, "default" | "success" | "warning" | "danger" | "soon"> = {
  STANDALONE: "default",
  HOLDING: "success",
  SUBSIDIARY: "warning",
  BRANCH: "soon",
};

export default async function EntitiesSettingsPage() {
  const result = await listOrgEntityGroups();

  if (!result.success) {
    redirect("/app/settings");
  }

  const { asAdmin, asMember } = result.data;
  const memberGroup = asMember?.entityGroup ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Entity Groups</h2>
        <p className="mt-1 text-sm text-slate-500">
          Manage multi-entity structures. A Holding Company can consolidate financials across its
          subsidiaries and branches.
        </p>
      </div>

      {/* Groups where this org is admin */}
      {asAdmin.length > 0 ? (
        <div className="space-y-6">
          {asAdmin.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{group.name}</h3>
                    {group.description && (
                      <p className="mt-0.5 text-sm text-slate-500">{group.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">Currency: {group.currency}</span>
                </div>
              </CardHeader>
              <CardContent>
                <h4 className="mb-3 text-sm font-medium text-slate-700">Member Entities</h4>
                {group.members.length === 0 ? (
                  <p className="text-sm text-slate-400">No member entities yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {group.members.map((m) => (
                      <li key={m.id} className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-slate-800">{m.name}</span>
                        <Badge
                          variant={ENTITY_TYPE_COLORS[m.entityType] ?? "default"}
                          className="text-xs"
                        >
                          {ENTITY_TYPE_LABELS[m.entityType] ?? m.entityType}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 border-t border-slate-100 pt-4">
                  <AddEntityForm entityGroupId={group.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : memberGroup ? (
        /* This org is a member (not admin) of a group */
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900">
              Member of: {memberGroup.name}
            </h3>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              This organisation is a member of the <strong>{memberGroup.name}</strong> entity
              group, administered by <strong>{memberGroup.adminOrg.name}</strong>.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Contact the group admin to modify membership or run consolidated reports.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Not in any group — show create form */
        <Card>
          <CardHeader>
            <h3 className="text-base font-semibold text-slate-900">Create an Entity Group</h3>
            <p className="mt-1 text-sm text-slate-500">
              Turn this organisation into a Holding Company and start adding subsidiaries or
              branches.
            </p>
          </CardHeader>
          <CardContent>
            <EntityGroupCreateForm />
          </CardContent>
        </Card>
      )}

      {/* Consolidated reports link */}
      {asAdmin.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">Consolidated Reporting</p>
          <p className="mt-1 text-xs text-slate-500">
            View consolidated P&amp;L and Balance Sheet across all entities in the group.
          </p>
          <a
            href="/app/intel/consolidation"
            className="mt-2 inline-block text-sm font-medium text-[#dc2626] hover:underline"
          >
            Open Consolidation Dashboard →
          </a>
        </div>
      )}
    </div>
  );
}
