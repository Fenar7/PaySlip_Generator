"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getInvitationDetails,
  acceptInvitation,
  type InvitationDetails,
} from "./actions";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      const update = () => setLoading(false);
      update();
      return;
    }
    getInvitationDetails(token).then((details) => {
      if (cancelled) return;
      setInvitation(details);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    setError("");
    const result = await acceptInvitation(token);
    if (result.success) {
      router.push("/app/home");
    } else {
      setError(result.error ?? "Failed to accept invitation");
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <p className="text-sm text-[#666]">Loading invitation…</p>
      </div>
    );
  }

  if (!token || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="bg-white rounded-xl shadow-sm border border-[#e5e5e5] p-8 w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-xl">✕</span>
          </div>
          <h1 className="text-lg font-semibold text-[#1a1a1a] mb-2">
            Invalid Invitation
          </h1>
          <p className="text-sm text-[#666] mb-6">
            This invitation link is invalid or has been removed.
          </p>
          <Button variant="secondary" onClick={() => router.push("/auth/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (invitation.status !== "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="bg-white rounded-xl shadow-sm border border-[#e5e5e5] p-8 w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-blue-600 text-xl">✓</span>
          </div>
          <h1 className="text-lg font-semibold text-[#1a1a1a] mb-2">
            Already Accepted
          </h1>
          <p className="text-sm text-[#666] mb-6">
            This invitation has already been accepted.
          </p>
          <Button onClick={() => router.push("/app/home")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (invitation.expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="bg-white rounded-xl shadow-sm border border-[#e5e5e5] p-8 w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-amber-600 text-xl">⏱</span>
          </div>
          <h1 className="text-lg font-semibold text-[#1a1a1a] mb-2">
            Invitation Expired
          </h1>
          <p className="text-sm text-[#666] mb-6">
            This invitation has expired. Please ask the team admin to send a new
            invitation.
          </p>
          <Button variant="secondary" onClick={() => router.push("/auth/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const roleLabel = invitation.role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="bg-white rounded-xl shadow-sm border border-[#e5e5e5] p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[#dc2626] flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">S</span>
          </div>
          <h1 className="text-lg font-semibold text-[#1a1a1a] mb-2">
            Join {invitation.orgName}
          </h1>
          <p className="text-sm text-[#666]">
            You&apos;ve been invited to join as a{" "}
            <span className="font-medium text-[#1a1a1a]">{roleLabel}</span>.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? "Joining…" : "Join Organization"}
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => router.push("/auth/login")}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
