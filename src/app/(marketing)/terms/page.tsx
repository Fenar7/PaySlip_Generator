import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mt-2 text-sm text-gray-500">
        Last updated: January 1, 2026
      </p>

      <div className="prose prose-gray mt-10 max-w-none space-y-8 text-sm leading-7 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Acceptance of Terms
          </h2>
          <p>
            By accessing or using Slipwise One (&quot;the Service&quot;),
            operated by Zenxvio, you agree to be bound by these Terms of
            Service. If you do not agree, please do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Service Description
          </h2>
          <p>
            Slipwise One is a cloud-based platform for creating, managing, and
            exporting professional business documents including invoices,
            vouchers, and salary slips. The Service includes document creation,
            PDF generation, team collaboration, and automation features.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            User Accounts
          </h2>
          <p>
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activities under your account. You
            must provide accurate and complete information when creating an
            account. You must notify us immediately of any unauthorized use of
            your account.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
          <p>
            Paid plans are billed in advance on a monthly or annual basis.
            Prices are listed in Indian Rupees (INR) and are exclusive of
            applicable taxes. You authorize us to charge your designated payment
            method for recurring fees. Refunds are handled on a case-by-case
            basis within 14 days of purchase.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Intellectual Property
          </h2>
          <p>
            You retain ownership of all content you create using the Service.
            Zenxvio retains all rights to the Service, its software, branding,
            and documentation. You may not copy, modify, distribute, or reverse
            engineer any part of the Service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by law, Zenxvio shall not be liable
            for any indirect, incidental, special, consequential, or punitive
            damages arising out of your use of the Service. Our total liability
            shall not exceed the amount paid by you in the 12 months preceding
            the claim.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Termination</h2>
          <p>
            We may suspend or terminate your account if you violate these Terms
            or engage in prohibited activity. You may terminate your account at
            any time by contacting support. Upon termination, your data will be
            retained for 30 days before permanent deletion, unless otherwise
            required by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            Governing Law
          </h2>
          <p>
            These Terms shall be governed by and construed in accordance with
            the laws of India. Any disputes shall be subject to the exclusive
            jurisdiction of the courts in Bangalore, Karnataka, India.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
          <p>
            For questions about these Terms, contact us at{" "}
            <a
              href="mailto:legal@zenxvio.com"
              className="text-red-600 hover:underline"
            >
              legal@zenxvio.com
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
