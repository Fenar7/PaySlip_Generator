import type { Metadata } from "next";
import { getWorkflowRunAnalytics, createIntelReportSnapshot } from "../actions";
import { requireOrgContext } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Workflow Runs | Reports",
};

export default async function WorkflowRunsReport(
  { searchParams }: { searchParams: Promise<{ status?: string; workflowId?: string }> }
) {
  const { orgId, userId } = await requireOrgContext();
  
  const resolvedParams = await searchParams;
  const runs = await getWorkflowRunAnalytics({
    status: resolvedParams.status,
    workflowId: resolvedParams.workflowId,
  });

  const handleSnapshot = async () => {
    "use server";
    await createIntelReportSnapshot({
      orgId,
      userId,
      reportType: "flow.workflow_runs",
      filters: resolvedParams,
      rowCount: runs.length,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Workflow Run Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Insights into workflow executions, status, and volumes.</p>
        </div>
        <form action={handleSnapshot}>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Export Snapshot
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Run ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Started At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Workflow Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Module</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Trigger</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {runs.map((run) => (
              <tr key={run.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                  {run.id.slice(0, 8)}...
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {new Date(run.startedAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{run.workflow.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{run.sourceModule}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{run.workflow.triggerType}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${run.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' : run.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                    {run.status}
                  </span>
                </td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No workflow runs found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
