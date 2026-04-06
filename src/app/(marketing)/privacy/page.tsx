import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-gray-500">
        Last updated: January 1, 2026
      </p>

      <div className="prose prose-gray mt-10 max-w-none space-y-8 text-sm leading-7 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Information We Collect
          </h2>
          <p>
            When you use Slipwise One, we collect information you provide
            directly, such as your name, email address, organization details,
            and document content. We also collect usage data including page
            views, feature usage, and device information to improve our service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            How We Use Your Information
          </h2>
          <p>We use the information we collect to:</p>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li>Provide, maintain, and improve Slipwise One</li>
            <li>Process transactions and send related information</li>
            <li>Send technical notices, updates, and support messages</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Monitor and analyze usage trends and preferences</li>
            <li>Detect, investigate, and prevent fraudulent or unauthorized activity</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Data Storage
          </h2>
          <p>
            Your data is stored securely on cloud infrastructure hosted by our
            service providers. We use encryption at rest and in transit. Document
            data is isolated per organization using row-level security policies.
            We retain your data for as long as your account is active or as
            needed to provide services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Cookies</h2>
          <p>
            We use cookies and similar technologies to maintain session state,
            remember your preferences, and understand how you use our service.
            You can control cookie settings through your browser preferences.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Third-party Services
          </h2>
          <p>
            We use third-party services for authentication (Supabase),
            analytics, payment processing, and email delivery. These services
            may collect information as described in their own privacy policies.
            We do not sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Your Rights</h2>
          <p>
            You have the right to access, update, or delete your personal
            information at any time. You can export your data or request account
            deletion by contacting our support team. We will respond to your
            request within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us
            at{" "}
            <a
              href="mailto:privacy@zenxvio.com"
              className="text-red-600 hover:underline"
            >
              privacy@zenxvio.com
            </a>
            .
          </p>
          <p className="mt-2">
            Zenxvio — the parent company behind Slipwise One.
          </p>
        </section>
      </div>
    </div>
  );
}
