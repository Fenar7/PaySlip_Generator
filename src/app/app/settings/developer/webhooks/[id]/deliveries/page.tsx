"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getDeliveryLog, replayDelivery } from "../../v2/actions";

interface Delivery {
  id: string;
  event: string;
  status: string;
  attempt: number | null;
  responseStatus: number | null;
  durationMs: number | null;
  createdAt: Date;
  deliveredAt: Date | null;
  requestBody: unknown;
  responseBody: string | null;
}

function StatusBadge({ status, httpStatus }: { status: string; httpStatus: number | null }) {
  if (status === "delivered") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        {httpStatus ?? 200}
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
      {httpStatus ?? "Failed"}
    </span>
  );
}

export default function DeliveriesPage() {
  const params = useParams();
  const endpointId = params.id as string;

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replaying, setReplaying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDeliveries = useCallback(
    async (p: number) => {
      setLoading(true);
      const result = await getDeliveryLog(endpointId, p);
      if (result.success) {
        setDeliveries(result.data.deliveries);
        setTotal(result.data.total);
        setPage(result.data.page);
        setPageSize(result.data.pageSize);
      }
      setLoading(false);
    },
    [endpointId],
  );

  useEffect(() => {
    loadDeliveries(1);
  }, [loadDeliveries]);

  async function handleReplay(deliveryId: string) {
    setReplaying(deliveryId);
    setError(null);
    const result = await replayDelivery(deliveryId);
    if (result.success) {
      loadDeliveries(page);
    } else {
      setError(result.error);
    }
    setReplaying(null);
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Delivery Log</h1>
        <p className="text-sm text-slate-500 mt-1">
          Webhook delivery history for endpoint {endpointId.slice(0, 8)}…
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-500 py-12">Loading…</div>
      ) : deliveries.length === 0 ? (
        <div className="text-center text-slate-500 py-12 border border-dashed border-slate-300 rounded-xl">
          No deliveries yet.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {deliveries.map((d) => (
              <div
                key={d.id}
                className="border border-slate-200 rounded-lg bg-white shadow-sm"
              >
                <button
                  type="button"
                  className="w-full px-4 py-3 flex items-center justify-between text-left"
                  onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={d.status} httpStatus={d.responseStatus} />
                    <span className="text-sm font-medium text-slate-800">{d.event}</span>
                    {d.attempt && d.attempt > 1 && (
                      <span className="text-xs text-slate-400">Attempt #{d.attempt}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    {d.durationMs != null && <span>{d.durationMs}ms</span>}
                    <span>{new Date(d.createdAt).toLocaleString()}</span>
                    <span>{expandedId === d.id ? "▲" : "▼"}</span>
                  </div>
                </button>

                {expandedId === d.id && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                    <div>
                      <h4 className="text-xs font-medium text-slate-500 uppercase mt-3 mb-1">
                        Request Body
                      </h4>
                      <pre className="bg-slate-50 rounded p-3 text-xs text-slate-700 overflow-x-auto max-h-48">
                        {JSON.stringify(d.requestBody, null, 2)}
                      </pre>
                    </div>
                    {d.responseBody && (
                      <div>
                        <h4 className="text-xs font-medium text-slate-500 uppercase mb-1">
                          Response Body
                        </h4>
                        <pre className="bg-slate-50 rounded p-3 text-xs text-slate-700 overflow-x-auto max-h-48">
                          {d.responseBody}
                        </pre>
                      </div>
                    )}
                    {d.status === "failed" && (
                      <Button
                        onClick={() => handleReplay(d.id)}
                        disabled={replaying === d.id}
                      >
                        {replaying === d.id ? "Replaying…" : "Replay"}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages} ({total} deliveries)
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => loadDeliveries(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  onClick={() => loadDeliveries(page + 1)}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
