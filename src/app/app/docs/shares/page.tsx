import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Share2, Package, ExternalLink, CheckCircle, XCircle, Clock } from "lucide-react";
import { listShareLinks, listBundles } from "./actions";

export const metadata = { title: "Share Center – Slipwise" };

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "Active", className: "bg-green-100 text-green-700" },
  EXPIRED: { label: "Expired", className: "bg-gray-100 text-gray-500" },
  REVOKED: { label: "Revoked", className: "bg-red-100 text-red-600" },
  DISABLED_BY_POLICY: { label: "Disabled", className: "bg-yellow-100 text-yellow-700" },
};

export default async function ShareCenterPage() {
  const [linksResult, bundlesResult] = await Promise.all([
    listShareLinks(),
    listBundles(),
  ]);

  const links = linksResult.success ? linksResult.data : [];
  const bundles = bundlesResult.success ? bundlesResult.data : [];

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Share Center</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all shared document links and bundles. Revoke access at any time.
          </p>
        </div>
      </div>

      {/* Share Links */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-gray-400" />
          <h2 className="text-base font-medium text-gray-800">Individual Share Links</h2>
          <span className="ml-auto text-xs text-gray-400">{links.length} total</span>
        </div>

        {links.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center">
            <Share2 className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No share links created yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Document</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Recipient</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Views</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Expires</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {links.map((link) => {
                  const badge = STATUS_BADGE[link.status] ?? STATUS_BADGE.ACTIVE;
                  return (
                    <tr key={link.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {link.docType.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {link.recipientEmail ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                          {link.status === "ACTIVE" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{link.viewCount}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {link.expiresAt ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {formatDistanceToNow(link.expiresAt, { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-gray-300">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDistanceToNow(link.createdAt, { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/docs/shares/${link.id}`}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Bundles */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-400" />
          <h2 className="text-base font-medium text-gray-800">Share Bundles</h2>
          <span className="ml-auto text-xs text-gray-400">{bundles.length} total</span>
        </div>

        {bundles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center">
            <Package className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm text-gray-500">No bundles created yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Bundle</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Items</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Recipient</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Views</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Expires</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {bundles.map((bundle) => {
                  const badge = STATUS_BADGE[bundle.status] ?? STATUS_BADGE.ACTIVE;
                  return (
                    <tr key={bundle.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{bundle.title}</div>
                        {bundle.description && (
                          <div className="text-xs text-gray-400">{bundle.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{bundle.itemCount}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {bundle.recipientEmail ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                          {bundle.status === "ACTIVE" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{bundle.viewCount}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {bundle.expiresAt ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            {formatDistanceToNow(bundle.expiresAt, { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-gray-300">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={bundle.bundleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> View
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
