import { Suspense } from "react";
import { TwoChallengeForm } from "./2fa-form";

export const metadata = { title: "Two-Factor Authentication" };

export default function TwoChallengePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--surface)]" />}>
      <TwoChallengeForm />
    </Suspense>
  );
}
