"use client";

import { useState, useTransition, useEffect } from "react";
import { useParams } from "next/navigation";
import { updatePortalProfile } from "../actions";

interface CustomerData {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export function PortalProfileForm({
  customer,
}: {
  customer: CustomerData;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [phone, setPhone] = useState(customer.phone || "");
  const [address, setAddress] = useState(customer.address || "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saved]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);

    startTransition(async () => {
      try {
        await updatePortalProfile(orgSlug, {
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        });
        setSaved(true);
      } catch {
        setError("Failed to update profile. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Read-only fields */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-700">Name</label>
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
          {customer.name}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-700">Email</label>
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
          {customer.email || "—"}
        </p>
        <p className="text-xs text-slate-400">
          Email cannot be changed as it is your login identifier
        </p>
      </div>

      {/* Editable fields */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-phone" className="text-xs font-semibold text-slate-700">
          Phone
        </label>
        <input
          id="profile-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Enter phone number"
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
          disabled={isPending}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="profile-address" className="text-xs font-semibold text-slate-700">
          Address
        </label>
        <textarea
          id="profile-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter your address"
          rows={3}
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 resize-none"
          disabled={isPending}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700" role="status">
          Profile updated successfully
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving…
          </>
        ) : (
          "Save Changes"
        )}
      </button>
    </form>
  );
}
