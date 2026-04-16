import Link from "next/link";
import { headers } from "next/headers";
import { FileText, Eye, ExternalLink, UserPlus, ShieldCheck, Mail } from "lucide-react";
import { getSharedDocument } from "@/lib/document-sharing";
import {
  isRecipientVerified,
  verifyRecipientToken,
  issueRecipientVerification,
  recordVerificationFailure,
} from "@/lib/recipient-verification";

const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  voucher: "Voucher",
  salary_slip: "Salary Slip",
};

// ─── Verification gate component ────────────────────────────────────────────

function VerificationRequiredPrompt({
  docType,
  token,
  error,
}: {
  docType: string;
  token: string;
  error?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full text-center">
        <ShieldCheck className="mx-auto h-16 w-16 text-blue-400" />
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Identity Verification Required
        </h1>
        <p className="mt-2 text-gray-600">
          This document requires you to verify your email address before
          you can view it.
        </p>
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <form
          action={`/share/${docType}/${token}`}
          method="GET"
          className="mt-8 flex flex-col gap-3"
        >
          <label htmlFor="email" className="text-left text-sm font-medium text-gray-700">
            Your email address
          </label>
          <div className="flex gap-2">
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Mail className="h-4 w-4" />
              Send Link
            </button>
          </div>
          <input type="hidden" name="request_verify" value="1" />
        </form>
      </div>
    </div>
  );
}

function VerificationSentPrompt() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="max-w-md w-full text-center">
        <Mail className="mx-auto h-16 w-16 text-green-400" />
        <h1 className="mt-6 text-2xl font-bold text-gray-900">
          Check your inbox
        </h1>
        <p className="mt-2 text-gray-600">
          We sent a verification link to your email. Click it to access the
          document. The link expires in 30 minutes.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SharedDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ docType: string; token: string }>;
  searchParams: Promise<{ verify?: string; email?: string; request_verify?: string }>;
}) {
  const { docType, token } = await params;
  const sp = await searchParams;
  const shared = await getSharedDocument(token);

  if (!shared) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md text-center">
          <FileText className="mx-auto h-16 w-16 text-gray-300" />
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Document not found
          </h1>
          <p className="mt-2 text-gray-600">
            This document link may have expired or been revoked.
          </p>
          <Link
            href="/auth/signup"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            <UserPlus className="h-4 w-4" />
            Create your own free
          </Link>
        </div>
      </div>
    );
  }

  // ── Recipient verification gate ──────────────────────────────────────────
  if (shared.requiresVerification) {
    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

    // Case 1: User is submitting a one-time token from the email link
    if (sp.verify) {
      const result = await verifyRecipientToken(sp.verify, ip);
      if (!result.ok) {
        await recordVerificationFailure(sp.verify);
        const messages: Record<string, string> = {
          expired: "This verification link has expired. Please request a new one.",
          max_failures: "Too many failed attempts. Please request a new verification link.",
          already_verified: "This link has already been used.",
          invalid: "Invalid or unknown verification link.",
        };
        return (
          <VerificationRequiredPrompt
            docType={docType}
            token={token}
            error={messages[result.reason] ?? "Verification failed."}
          />
        );
      }
      // Verified — fall through to render document below.
      // The VERIFIED record in the DB is the persistent proof of identity.
    } else if (sp.request_verify === "1" && sp.email) {
      // Case 2: User submitted the email form — send them a verification email
      try {
        await issueRecipientVerification({
          sharedDocumentId: shared.id,
          recipientEmail: sp.email,
          ip,
        });
      } catch {
        // Swallow errors — don't reveal whether the email was deliverable
      }
      return <VerificationSentPrompt />;
    } else {
      // Case 3: No token, no email submission — show the gate form
      // Check if this session already has a verified record (via recipientEmail on the share)
      let alreadyVerified = false;
      if (shared.recipientEmail) {
        alreadyVerified = await isRecipientVerified(shared.id, shared.recipientEmail);
      }
      if (!alreadyVerified) {
        return <VerificationRequiredPrompt docType={docType} token={token} />;
      }
    }
  }

  const label = DOC_TYPE_LABELS[docType] || docType;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-gray-900">
            Slipwise<span className="text-red-600">.</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Eye className="h-3.5 w-3.5" />
              {shared.viewCount} views
            </span>
            <Link
              href="/auth/signup"
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </header>

      {/* Document display */}
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-block rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
                Shared {label}
              </span>
              <h1 className="mt-3 text-2xl font-bold text-gray-900">
                {label} Document
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Document ID: {shared.docId}
              </p>
            </div>
            <FileText className="h-10 w-10 text-gray-300" />
          </div>

          {/* Placeholder document area */}
          <div className="mt-8 flex h-96 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-3 text-sm text-gray-500">
                Shared {label.toLowerCase()} document preview
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Full document rendering coming soon
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-6 text-xs text-gray-500">
            <span>
              Shared on{" "}
              {new Date(shared.createdAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            {shared.expiresAt && (
              <span>
                Expires{" "}
                {new Date(shared.expiresAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-white"
          >
            <ExternalLink className="h-4 w-4" />
            View on Slipwise
          </Link>
          <Link
            href="/auth/signup"
            className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            <UserPlus className="h-4 w-4" />
            Create your own free
          </Link>
        </div>
      </main>
    </div>
  );
}
