import { getReviewQueue } from "./actions";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function AdminReviewQueuePage() {
  const result = await getReviewQueue();
  
  if (!result.success) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Template Review Queue</h1>
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {result.error}
        </div>
      </div>
    );
  }

  const templates = result.data as any[];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Template Review Queue</h1>
        <p className="text-muted-foreground mt-1">
          Review and govern templates submitted to the marketplace
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="bg-card text-center py-12 rounded-lg border border-border">
          <p className="text-muted-foreground">No templates pending review.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground border-b border-border">
              <tr>
                <th className="px-6 py-3 font-medium">Template</th>
                <th className="px-6 py-3 font-medium">Publisher</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Submitted</th>
                <th className="px-6 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {templates.map((tpl) => (
                <tr key={tpl.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-foreground">{tpl.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{tpl.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div>{tpl.publisherOrg?.name || tpl.publisherName}</div>
                  </td>
                  <td className="px-6 py-4 capitalize">{tpl.templateType?.toLowerCase()}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {formatDistanceToNow(new Date(tpl.createdAt), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/app/docs/templates/review/${tpl.id}`}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
