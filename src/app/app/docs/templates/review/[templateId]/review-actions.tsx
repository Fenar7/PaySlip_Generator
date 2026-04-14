"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveTemplate, rejectTemplate, archiveTemplate } from "../actions";

export default function ReviewActions({ templateId }: { templateId: string }) {
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to approve and publish this template?")) return;
    setLoading(true);
    const result = await approveTemplate(templateId);
    if (result.success) {
      router.push("/app/docs/templates/review");
    } else {
      alert(result.error);
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) {
      alert("Please provide a rejection reason.");
      return;
    }
    setLoading(true);
    const result = await rejectTemplate(templateId, rejectReason);
    if (result.success) {
      router.push("/app/docs/templates/review");
    } else {
      alert(result.error);
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm("Are you sure you want to archive this template?")) return;
    setLoading(true);
    const result = await archiveTemplate(templateId);
    if (result.success) {
      router.push("/app/docs/templates/review");
    } else {
      alert(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-6 mt-6 border-t border-border">
      <h3 className="text-lg font-semibold">Governance Actions</h3>
      
      {!isRejecting ? (
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleApprove}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            Approve & Publish
          </button>
          
          <button
            onClick={() => setIsRejecting(true)}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            Reject
          </button>
          
          <button
            onClick={handleArchive}
            disabled={loading}
            className="bg-muted hover:bg-muted/80 text-foreground border border-border px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ml-auto"
          >
            Archive
          </button>
        </div>
      ) : (
        <div className="space-y-3 bg-muted/30 p-4 rounded-md border border-border">
          <label className="block text-sm font-medium">Rejection Reason</label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Explain why this template cannot be published..."
          />
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              Confirm Rejection
            </button>
            <button
              onClick={() => setIsRejecting(false)}
              disabled={loading}
              className="bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
