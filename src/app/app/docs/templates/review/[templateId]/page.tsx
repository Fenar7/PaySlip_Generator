import { getTemplateForReview } from "../actions";
import Link from "next/link";
import ReviewActions from "./review-actions";

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const result = await getTemplateForReview(templateId);

  if (!result.success) {
    return (
      <div className="p-6">
        <Link href="/app/docs/templates/review" className="text-primary text-sm hover:underline mb-4 inline-block">
          &larr; Back to Queue
        </Link>
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {result.error}
        </div>
      </div>
    );
  }

  const template = result.data;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link href="/app/docs/templates/review" className="text-primary text-sm hover:underline inline-block">
        &larr; Back to Queue
      </Link>
      
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold tracking-tight">{template.name}</h1>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            template.status === "PENDING_REVIEW" ? "bg-yellow-100 text-yellow-800" :
            template.status === "PUBLISHED" ? "bg-green-100 text-green-800" :
            template.status === "REJECTED" ? "bg-red-100 text-red-800" :
            "bg-gray-100 text-gray-800"
          }`}>
            {template.status.replace("_", " ")}
          </span>
        </div>
        <p className="text-muted-foreground">{template.description}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-card border border-border p-4 rounded-lg">
            <h3 className="text-sm font-semibold mb-3">Template Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium capitalize">{template.templateType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Publisher</dt>
                <dd className="font-medium">{template.publisherDisplayName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Price</dt>
                <dd className="font-medium">{Number(template.price) === 0 ? "Free" : `${template.currency} ${template.price}`}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-medium">{template.version}</dd>
              </div>
            </dl>
          </div>
          
          <div className="bg-card border border-border p-4 rounded-lg space-y-2">
            <h3 className="text-sm font-semibold">Categories & Tags</h3>
            <div className="flex flex-wrap gap-2">
              {template.category?.map((c: string) => (
                <span key={c} className="bg-primary/10 text-primary px-2 py-1 rounded text-xs">{c}</span>
              ))}
              {template.tags?.map((t: string) => (
                <span key={t} className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs">{t}</span>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-muted border border-border rounded-lg overflow-hidden aspect-video">
            {template.previewImageUrl ? (
              <img
                src={template.previewImageUrl}
                alt={template.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                No Preview Image
              </div>
            )}
          </div>
          
          {template.previewPdfUrl && (
            <div className="mt-3 text-right">
              <a 
                href={template.previewPdfUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-primary text-sm hover:underline"
              >
                View PDF Preview &rarr;
              </a>
            </div>
          )}
        </div>
      </div>

      {template.status === "PENDING_REVIEW" && (
        <ReviewActions templateId={templateId} />
      )}
      
      {template.rejectionReason && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mt-6">
          <h4 className="text-sm font-bold mb-1">Rejection Reason</h4>
          <p className="text-sm">{template.rejectionReason}</p>
        </div>
      )}
    </div>
  );
}
