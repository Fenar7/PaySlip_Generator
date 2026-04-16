import type { Metadata } from "next";
import { PassportWorkspace } from "@/features/pixel/components/passport/passport-workspace";
import { RegistrationCTA } from "@/features/pixel/components/registration-cta";

export const metadata: Metadata = {
  title: "Passport Photo",
  description:
    "Create passport, visa & ID photos for UK, US, India, UAE, Schengen and more. Free, no account required.",
  alternates: {
    canonical: "/pixel/passport",
  },
};

export default function PublicPassportPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1a1a1a]">
          🪪 Passport Photo Studio
        </h1>
        <p className="mt-1 text-sm text-[#666]">
          Upload, crop, and download professional passport photos. Supports 13+
          country presets.
        </p>
      </div>

      <PassportWorkspace showRegistrationCTA />

      <RegistrationCTA />
    </div>
  );
}
