"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";

const BILLING_CYCLES = ["monthly", "yearly"] as const;
type BillingCycle = (typeof BILLING_CYCLES)[number];

const plans = [
  {
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "For individuals getting started",
    cta: "Get Started",
    highlighted: false,
    features: [
      "5 documents/month",
      "1 user",
      "Basic templates",
      "PDF export",
      "Email support",
    ],
  },
  {
    name: "Starter",
    monthlyPrice: 999,
    yearlyPrice: 9990,
    description: "For small businesses",
    cta: "Start Trial",
    highlighted: false,
    features: [
      "100 documents/month",
      "3 users",
      "All templates",
      "PDF Studio",
      "Custom branding",
      "Priority support",
    ],
  },
  {
    name: "Pro",
    monthlyPrice: 2999,
    yearlyPrice: 29990,
    description: "For growing teams",
    cta: "Start Trial",
    highlighted: true,
    features: [
      "Unlimited documents",
      "10 users",
      "All templates",
      "PDF Studio + watermarks",
      "Recurring invoices",
      "Analytics dashboard",
      "API access",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    monthlyPrice: 9999,
    yearlyPrice: 99990,
    description: "For large organizations",
    cta: "Contact Sales",
    highlighted: false,
    features: [
      "Unlimited everything",
      "Unlimited users",
      "Custom templates",
      "Advanced PDF Studio",
      "Recurring + automation",
      "Full analytics",
      "API + webhooks",
      "Dedicated support",
      "SLA guarantee",
    ],
  },
];

const comparisonFeatures = [
  { name: "Documents/month", free: "5", starter: "100", pro: "Unlimited", enterprise: "Unlimited" },
  { name: "Users", free: "1", starter: "3", pro: "10", enterprise: "Unlimited" },
  { name: "PDF export", free: true, starter: true, pro: true, enterprise: true },
  { name: "PDF Studio", free: false, starter: true, pro: true, enterprise: true },
  { name: "Custom branding", free: false, starter: true, pro: true, enterprise: true },
  { name: "Watermarks", free: false, starter: false, pro: true, enterprise: true },
  { name: "Recurring invoices", free: false, starter: false, pro: true, enterprise: true },
  { name: "Analytics", free: false, starter: false, pro: true, enterprise: true },
  { name: "API access", free: false, starter: false, pro: true, enterprise: true },
  { name: "Webhooks", free: false, starter: false, pro: false, enterprise: true },
  { name: "SLA guarantee", free: false, starter: false, pro: false, enterprise: true },
];

const faqs = [
  {
    q: "Can I switch plans anytime?",
    a: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the start of your next billing cycle.",
  },
  {
    q: "Is there a free trial?",
    a: "All paid plans come with a 14-day free trial. No credit card required to start.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit/debit cards, UPI, and net banking through our payment partner.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Absolutely. There are no long-term contracts. Cancel anytime and you won't be charged for the next cycle.",
  },
  {
    q: "Do you offer discounts for annual billing?",
    a: "Yes — annual plans are discounted by approximately 17% compared to monthly billing.",
  },
];

function formatPrice(price: number): string {
  if (price === 0) return "Free";
  return `₹${price.toLocaleString("en-IN")}`;
}

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");

  return (
    <div className="bg-white">
      {/* Header */}
      <section className="py-20 text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          Choose the plan that fits your business. Start free, upgrade when
          you&apos;re ready.
        </p>

        {/* Billing toggle */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span
            className={`text-sm font-medium ${billing === "monthly" ? "text-gray-900" : "text-gray-500"}`}
          >
            Monthly
          </span>
          <button
            onClick={() =>
              setBilling(billing === "monthly" ? "yearly" : "monthly")
            }
            className={`relative h-6 w-11 rounded-full transition-colors ${
              billing === "yearly" ? "bg-red-600" : "bg-gray-300"
            }`}
            aria-label="Toggle billing cycle"
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                billing === "yearly" ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <span
            className={`text-sm font-medium ${billing === "yearly" ? "text-gray-900" : "text-gray-500"}`}
          >
            Yearly{" "}
            <span className="text-xs font-normal text-green-600">
              Save ~17%
            </span>
          </span>
        </div>
      </section>

      {/* Plan Cards */}
      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-8 lg:grid-cols-4">
          {plans.map((plan) => {
            const price =
              billing === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 ${
                  plan.highlighted
                    ? "border-red-600 shadow-lg ring-1 ring-red-600"
                    : "border-gray-200"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {plan.description}
                </p>
                <p className="mt-6">
                  <span className="text-4xl font-bold text-gray-900">
                    {formatPrice(price)}
                  </span>
                  {price > 0 && (
                    <span className="text-sm text-gray-500">
                      /{billing === "monthly" ? "mo" : "yr"}
                    </span>
                  )}
                </p>
                <Link
                  href="/auth/signup"
                  className={`mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {plan.cta}
                </Link>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-12 text-center text-2xl font-bold text-gray-900">
            Feature comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 text-left font-semibold text-gray-900">
                    Feature
                  </th>
                  {["Free", "Starter", "Pro", "Enterprise"].map((name) => (
                    <th
                      key={name}
                      className="py-3 text-center font-semibold text-gray-900"
                    >
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row) => (
                  <tr key={row.name} className="border-b border-gray-100">
                    <td className="py-3 text-gray-700">{row.name}</td>
                    {(["free", "starter", "pro", "enterprise"] as const).map(
                      (plan) => {
                        const val = row[plan];
                        return (
                          <td key={plan} className="py-3 text-center">
                            {typeof val === "boolean" ? (
                              val ? (
                                <Check className="mx-auto h-4 w-4 text-green-500" />
                              ) : (
                                <Minus className="mx-auto h-4 w-4 text-gray-300" />
                              )
                            ) : (
                              <span className="text-gray-700">{val}</span>
                            )}
                          </td>
                        );
                      },
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-12 text-center text-2xl font-bold text-gray-900">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-xl border border-gray-200 p-6"
              >
                <h3 className="font-semibold text-gray-900">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
