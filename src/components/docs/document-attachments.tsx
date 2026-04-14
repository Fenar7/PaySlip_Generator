"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Trash2, Download, FileText, Loader2 } from "lucide-react";
import { uploadDocAttachment, deleteDocAttachment, getDocAttachmentUrl } from "@/app/app/docs/attachment-actions";

type DocType = "invoice" | "voucher" | "salary_slip" | "quote";

interface Attachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string | Date;
}

interface DocumentAttachmentsProps {
  docId: string;
  docType: DocType;
  attachments: Attachment[];
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function DocumentAttachments({ docId, docType, attachments }: DocumentAttachmentsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const handleUpload = () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("docId", docId);
      formData.set("docType", docType);
      formData.set("file", file);

      const result = await uploadDocAttachment(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setFile(null);
      const input = document.getElementById(`attachment-input-${docId}`) as HTMLInputElement | null;
      if (input) input.value = "";
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    setError(null);
    setActioningId(id);
    startTransition(async () => {
      const result = await deleteDocAttachment(id, docType);
      setActioningId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const handleDownload = async (id: string, fileName: string) => {
    setError(null);
    setActioningId(id);
    const result = await getDocAttachmentUrl(id);
    setActioningId(null);
    if (!result.success) {
      setError(result.error);
      return;
    }
    
    const a = document.createElement('a');
    a.href = result.data.url;
    a.target = '_blank';
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Paperclip className="h-5 w-5 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-900">Attachments</h3>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          id={`attachment-input-${docId}`}
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
          disabled={isPending}
        />
        <button
          onClick={handleUpload}
          disabled={isPending || !file}
          className="whitespace-nowrap rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isPending && !actioningId ? <Loader2 className="inline h-4 w-4 animate-spin mr-2" /> : null}
          Upload
        </button>
      </div>

      {attachments.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
          {attachments.map((att) => (
            <li key={att.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{att.fileName}</p>
                  <p className="text-xs text-slate-500">
                    {formatBytes(att.size)} • {new Date(att.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button
                  onClick={() => handleDownload(att.id, att.fileName)}
                  disabled={isPending || actioningId === att.id}
                  className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(att.id)}
                  disabled={isPending || actioningId === att.id}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                  title="Delete"
                >
                  {actioningId === att.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {attachments.length === 0 && (
        <p className="text-sm text-slate-500 pt-2 pb-1 text-center border-t border-slate-100 mt-4">
          No attachments yet.
        </p>
      )}
    </div>
  );
}
