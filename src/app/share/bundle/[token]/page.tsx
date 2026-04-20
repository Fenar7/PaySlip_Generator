import Link from "next/link";
import { FileText, Package, ExternalLink, Lock, AlertCircle, Download } from "lucide-react";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  voucher: "Voucher",
  salary_slip: "Salary Slip",
};

async function getBundleData(token: string) {
  const bundle = await db.shareBundle.findUnique({
    where: { token },
    include: {
      organization: {
        select: { name: true, branding: { select: { logoUrl: true, accentColor: true } } },
      },
      items: {
        orderBy: { sortOrder: "asc" },
        include: {
          sharedDocument: {
            select: { id: true, docType: true, docId: true, status: true, downloadAllowed: true, shareToken: true },
          },
        },
      },
    },
  });

  return bundle;
}

async function logBundleView(bundleId: string, orgId: string) {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for") ?? hdrs.get("x-real-ip") ?? null;
  const ua = hdrs.get("user-agent") ?? null;

  await Promise.all([
    db.shareBundle.update({
      where: { id: bundleId },
      data: { viewCount: { increment: 1 } },
    }),
    db.shareAccessLog.create({
      data: { orgId, bundleId, event: "VIEWED", ip, userAgent: ua },
    }),
  ]);
}

export default async function BundlePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const bundle = await getBundleData(token);

  if (!bundle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md text-center">
          <Package className="mx-auto h-16 w-16 text-gray-300" />
          <h1 className="mt-6 text-2xl font-bold text-gray-900">Bundle not found</h1>
          <p className="mt-2 text-gray-600">
            This document bundle may have expired or been revoked.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
          >
            Back to Slipwise
          </Link>
        </div>
      </div>
    );
  }

  // Check lifecycle
  const isExpired = bundle.expiresAt && bundle.expiresAt < new Date();
  const isRevoked = bundle.status === "REVOKED";

  if (isExpired || isRevoked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md text-center">
          <Lock className="mx-auto h-16 w-16 text-gray-300" />
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            {isRevoked ? "Access revoked" : "Link expired"}
          </h1>
          <p className="mt-2 text-gray-600">
            {isRevoked
              ? "This bundle has been revoked by the sender."
              : "This bundle link has expired. Please contact the sender for a new link."}
          </p>
        </div>
      </div>
    );
  }

  // Record view asynchronously (fire-and-forget in server component context)
  void logBundleView(bundle.id, bundle.orgId);

  const accentColor = bundle.organization.branding?.accentColor ?? "#2563eb";
  const logoUrl = bundle.organization.branding?.logoUrl;

  const activeItems = bundle.items.filter(
    (item) => item.sharedDocument && item.sharedDocument.status === "ACTIVE"
  );

  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{`:root { --bundle-accent: ${accentColor}; }`}</style>

      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={bundle.organization.name}
                className="h-7 w-auto object-contain"
                width={120}
                height={28}
                loading="eager"
                decoding="async"
              />
            ) : (
              <span className="text-base font-bold text-gray-900">{bundle.organization.name}</span>
            )}
          </div>
          <span className="text-xs text-gray-400">Secure document bundle</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Bundle info */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Package className="h-4 w-4" />
            <span>{bundle.organization.name} sent you a document bundle</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{bundle.title}</h1>
          {bundle.description && (
            <p className="mt-1 text-gray-600">{bundle.description}</p>
          )}
          {bundle.expiresAt && (
            <p className="mt-2 flex items-center gap-1 text-xs text-amber-600">
              <AlertCircle className="h-3 w-3" />
              Expires {bundle.expiresAt.toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Document list */}
        {activeItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No accessible documents in this bundle.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeItems.map((item) => {
              const doc = item.sharedDocument!;
              const label = DOC_TYPE_LABELS[doc.docType] ?? doc.docType;
              const docUrl = `${BASE_URL}/share/${doc.docType}/${doc.shareToken}`;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm"
                >
                  <FileText className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400 truncate">{doc.docId}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {bundle.downloadAllowed && doc.downloadAllowed && (
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    )}
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                      style={{ backgroundColor: accentColor }}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Powered by footer */}
        <div className="mt-12 text-center text-xs text-gray-400">
          Securely shared via{" "}
          <Link href="/" className="font-medium text-gray-500 hover:underline">
            Slipwise
          </Link>
        </div>
      </main>
    </div>
  );
}
