import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getBooksJournal } from "../../actions";
import { JournalAttachmentDownloadButton } from "../../components/journal-attachment-download-button";
import { JournalAttachmentForm } from "../../components/journal-attachment-form";
import { booksStatusBadgeVariant, formatBooksMoney } from "../../view-helpers";

export const metadata = {
  title: "Journal Detail | Slipwise",
};

interface JournalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function JournalDetailPage({
  params,
}: JournalDetailPageProps) {
  const { id } = await params;
  const result = await getBooksJournal(id);

  if (!result.success) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {result.error}
        </div>
      </div>
    );
  }

  const journal = result.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/app/books/journals"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          Back to journal register
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              {journal.entryNumber}
            </h1>
            <Badge variant={booksStatusBadgeVariant(journal.status)}>
              {journal.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {journal.source.replaceAll("_", " ")} •{" "}
            {new Date(journal.entryDate).toLocaleDateString()} • {journal.period.label}
          </p>
          {journal.memo && (
            <p className="mt-2 text-sm text-slate-700">{journal.memo}</p>
          )}
        </div>

        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <div className="text-slate-600">
            Total debit:{" "}
            <strong className="text-slate-900">
              {formatBooksMoney(journal.totalDebit)}
            </strong>
          </div>
          <div className="mt-1 text-slate-600">
            Total credit:{" "}
            <strong className="text-slate-900">
              {formatBooksMoney(journal.totalCredit)}
            </strong>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Journal lines</h2>
          <p className="mt-1 text-sm text-slate-500">
            Balanced posting detail for this journal entry.
          </p>
        </CardHeader>
        <CardContent className="px-0 py-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Line</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Debit</th>
                  <th className="px-4 py-3">Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {journal.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {line.lineNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div className="font-medium">
                        {line.account.code} — {line.account.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {line.account.accountType} • {line.account.normalBalance}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {line.description ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {line.debit > 0 ? formatBooksMoney(line.debit) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {line.credit > 0 ? formatBooksMoney(line.credit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {journal.status !== "REVERSED" && (
        <JournalAttachmentForm journalEntryId={journal.id} />
      )}

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">
            Journal attachments
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Support documents, reconciliations, and audit evidence linked to this
            journal.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {journal.attachments.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No journal evidence uploaded yet.
            </div>
          ) : (
            journal.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {attachment.mimeType} •{" "}
                    {Math.max(1, Math.round(attachment.size / 1024))} KB •{" "}
                    {new Date(attachment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <JournalAttachmentDownloadButton attachmentId={attachment.id} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
