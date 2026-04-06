"use client";

import Link from "next/link";

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="py-20 px-6 bg-gradient-to-b from-[#1a1a1a] to-[#2d2d2d] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Slipwise API
          </h1>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Integrate invoicing, vouchers, and salary slips into your applications
            with our REST API. Automate document management at scale.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/app/settings/api"
              className="px-6 py-3 bg-[#dc2626] text-white rounded-lg font-medium hover:bg-[#b91c1c] transition-colors"
            >
              Get API Key
            </Link>
            <Link
              href="/api/v1/openapi.json"
              className="px-6 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
            >
              OpenAPI Spec
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-8">Quick Start</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">1. Get your API key</h3>
              <p className="text-[#666] mb-3">
                Navigate to{" "}
                <Link href="/app/settings/api" className="text-[#dc2626] hover:underline">
                  Settings → API Keys
                </Link>{" "}
                and create a new key. Choose the scopes you need.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">2. Make your first request</h3>
              <div className="bg-[#1a1a1a] rounded-xl p-4 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono whitespace-pre">{`# List your invoices
curl -H "Authorization: Bearer slw_live_YOUR_KEY" \\
  https://slipwise.in/api/v1/invoices`}</pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">3. Create an invoice</h3>
              <div className="bg-[#1a1a1a] rounded-xl p-4 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono whitespace-pre">{`curl -X POST https://slipwise.in/api/v1/invoices \\
  -H "Authorization: Bearer slw_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "invoiceNumber": "INV-001",
    "invoiceDate": "2025-01-15",
    "dueDate": "2025-02-15",
    "customerId": "cust_id_here",
    "lineItems": [
      {
        "description": "Web Development",
        "quantity": 1,
        "unitPrice": 50000,
        "taxRate": 18
      }
    ]
  }'`}</pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">4. Mark as paid</h3>
              <div className="bg-[#1a1a1a] rounded-xl p-4 overflow-x-auto">
                <pre className="text-sm text-green-400 font-mono whitespace-pre">{`curl -X POST https://slipwise.in/api/v1/invoices/{id}/mark-paid \\
  -H "Authorization: Bearer slw_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 59000, "method": "bank_transfer"}'`}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="py-16 px-6 bg-[#fafafa]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-8">Authentication</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-[#1a1a1a] mb-2">Bearer Token</h3>
              <p className="text-sm text-[#666] mb-3">
                Pass your API key in the Authorization header:
              </p>
              <div className="bg-[#f5f5f5] rounded-lg p-3">
                <code className="text-xs font-mono">Authorization: Bearer slw_live_...</code>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-[#1a1a1a] mb-2">X-API-Key Header</h3>
              <p className="text-sm text-[#666] mb-3">
                Alternatively, use the X-API-Key header:
              </p>
              <div className="bg-[#f5f5f5] rounded-lg p-3">
                <code className="text-xs font-mono">X-API-Key: slw_live_...</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Response Format */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-8">Response Format</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-[#1a1a1a] mb-3">Success Response</h3>
              <div className="bg-[#1a1a1a] rounded-xl p-4">
                <pre className="text-sm text-green-400 font-mono whitespace-pre">{`{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}`}</pre>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-[#1a1a1a] mb-3">Error Response</h3>
              <div className="bg-[#1a1a1a] rounded-xl p-4">
                <pre className="text-sm text-red-400 font-mono whitespace-pre">{`{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid API key."
  }
}`}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Endpoints */}
      <section className="py-16 px-6 bg-[#fafafa]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-8">API Endpoints</h2>
          <div className="space-y-3">
            {[
              { method: "GET", path: "/api/v1/invoices", desc: "List invoices" },
              { method: "POST", path: "/api/v1/invoices", desc: "Create invoice" },
              { method: "GET", path: "/api/v1/invoices/:id", desc: "Get invoice" },
              { method: "PATCH", path: "/api/v1/invoices/:id", desc: "Update invoice" },
              { method: "DELETE", path: "/api/v1/invoices/:id", desc: "Delete invoice" },
              { method: "POST", path: "/api/v1/invoices/:id/send", desc: "Send invoice" },
              { method: "POST", path: "/api/v1/invoices/:id/mark-paid", desc: "Mark as paid" },
              { method: "POST", path: "/api/v1/invoices/:id/payment-link", desc: "Create payment link" },
              { method: "GET", path: "/api/v1/vouchers", desc: "List vouchers" },
              { method: "POST", path: "/api/v1/vouchers", desc: "Create voucher" },
              { method: "GET", path: "/api/v1/salary-slips", desc: "List salary slips" },
              { method: "POST", path: "/api/v1/salary-slips", desc: "Create salary slip" },
              { method: "GET", path: "/api/v1/customers", desc: "List customers" },
              { method: "GET", path: "/api/v1/employees", desc: "List employees" },
              { method: "GET", path: "/api/v1/vendors", desc: "List vendors" },
              { method: "GET", path: "/api/v1/reports/summary", desc: "Dashboard summary" },
              { method: "GET", path: "/api/v1/reports/outstanding", desc: "Outstanding invoices" },
            ].map((ep) => (
              <div
                key={`${ep.method}-${ep.path}`}
                className="flex items-center gap-3 bg-white rounded-lg border px-4 py-3"
              >
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    ep.method === "GET"
                      ? "bg-blue-50 text-blue-700"
                      : ep.method === "POST"
                      ? "bg-green-50 text-green-700"
                      : ep.method === "PATCH"
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {ep.method}
                </span>
                <code className="text-sm font-mono text-[#1a1a1a]">{ep.path}</code>
                <span className="text-sm text-[#666] ml-auto">{ep.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scopes */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-8">Scopes</h2>
          <p className="text-[#666] mb-4">
            Control what your API key can access using fine-grained scopes:
          </p>
          <div className="grid md:grid-cols-3 gap-3">
            {[
              "read:invoices", "write:invoices", "delete:invoices",
              "read:vouchers", "write:vouchers", "delete:vouchers",
              "read:salary-slips", "write:salary-slips", "delete:salary-slips",
              "read:customers", "write:customers",
              "read:employees", "write:employees",
              "read:vendors", "write:vendors",
              "read:reports",
            ].map((scope) => (
              <div key={scope} className="bg-[#f5f5f5] rounded-lg px-3 py-2">
                <code className="text-sm font-mono">{scope}</code>
              </div>
            ))}
          </div>
          <p className="text-sm text-[#666] mt-4">
            Use <code className="bg-[#f5f5f5] px-1 rounded">*</code> for full access.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6 bg-[#fafafa]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">API Pricing</h2>
          <p className="text-[#666] mb-8">
            API access is available on Pro and Enterprise plans.
          </p>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-lg mb-2">Pro</h3>
              <p className="text-2xl font-bold text-[#1a1a1a]">₹2,999<span className="text-sm font-normal text-[#666]">/mo</span></p>
              <ul className="text-sm text-[#666] mt-4 space-y-1 text-left">
                <li>✓ 2 API keys</li>
                <li>✓ 10,000 requests/month</li>
                <li>✓ Webhooks</li>
              </ul>
            </div>
            <div className="bg-white rounded-xl border-2 border-[#dc2626] p-6">
              <h3 className="font-semibold text-lg mb-2">Enterprise</h3>
              <p className="text-2xl font-bold text-[#1a1a1a]">₹9,999<span className="text-sm font-normal text-[#666]">/mo</span></p>
              <ul className="text-sm text-[#666] mt-4 space-y-1 text-left">
                <li>✓ Unlimited API keys</li>
                <li>✓ Unlimited requests</li>
                <li>✓ Webhooks</li>
                <li>✓ Priority support</li>
              </ul>
            </div>
          </div>
          <Link
            href="/pricing"
            className="inline-block mt-8 text-[#dc2626] hover:underline font-medium"
          >
            View all plans →
          </Link>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-6 bg-[#1a1a1a] text-white text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to integrate?</h2>
        <p className="text-gray-400 mb-6">Get started in minutes with our REST API.</p>
        <Link
          href="/app/settings/api"
          className="px-8 py-3 bg-[#dc2626] text-white rounded-lg font-medium hover:bg-[#b91c1c] transition-colors"
        >
          Create Your First API Key
        </Link>
      </section>
    </div>
  );
}
