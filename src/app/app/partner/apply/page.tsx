"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyForPartner } from "../actions";

type PartnerType = "ACCOUNTANT" | "TECHNOLOGY" | "RESELLER";

export default function PartnerApplyPage() {
  const [type, setType] = useState<PartnerType>("ACCOUNTANT");
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    profileId: string;
    partnerCode: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;

    setSubmitting(true);
    setError(null);

    const res = await applyForPartner({
      type,
      companyName: companyName.trim(),
      website: website.trim() || undefined,
      description: description.trim() || undefined,
    });

    if (res.success) {
      setResult(res.data);
    } else {
      setError(res.error);
    }
    setSubmitting(false);
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <Card>
          <CardContent>
            <div className="py-8 text-center">
              <div className="text-4xl">🎉</div>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">
                Application Submitted!
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Your partner application is pending review. We&apos;ll notify you
                once approved.
              </p>
              <div className="mt-6 rounded-md border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500">
                  Your Partner Code
                </p>
                <p className="mt-1 text-lg font-mono font-bold text-gray-900">
                  {result.partnerCode}
                </p>
              </div>
              <Link href="/app/partner">
                <Button className="mt-6">Go to Partner Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Apply for Partner Program
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Join our partner program to manage clients and earn revenue share.
        </p>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            Partner Application
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Partner Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PartnerType)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ACCOUNTANT">Accountant</option>
                <option value="TECHNOLOGY">Technology</option>
                <option value="RESELLER">Reseller</option>
              </select>
            </div>

            <Input
              label="Company Name"
              placeholder="Your company name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />

            <Input
              label="Website"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Tell us about your business and why you'd like to partner with us"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" disabled={submitting || !companyName.trim()}>
              {submitting ? "Submitting…" : "Submit Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
