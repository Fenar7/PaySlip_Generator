"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthLogo } from "@/features/auth/components/auth-logo";

const SLIDES = [
  {
    id: 1,
    title: "Document Automation",
    description: "Design templates, set sequences, and generate documents at scale.",
  },
  {
    id: 2,
    title: "Payslip Generation",
    description: "Generate compliant payslips with PF, ESI, and tax breakdowns automatically.",
  },
  {
    id: 3,
    title: "GST Invoicing",
    description: "Create GST-compliant invoices with e-invoice integration and real-time validation.",
  },
  {
    id: 4,
    title: "Books & Accounting",
    description: "Track ledgers, run trial balances, and reconcile transactions effortlessly.",
  },
  {
    id: 5,
    title: "Vendor Compliance",
    description: "Match GSTR-2B data, manage vendor bills, and stay audit-ready.",
  },
  {
    id: 6,
    title: "Financial Insights",
    description: "Get real-time dashboards, forecasts, and actionable business intelligence.",
  },
];

const SLIDE_INTERVAL_MS = 5000;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branded panel */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-[45%] flex-col overflow-hidden"
        style={{ background: "linear-gradient(180deg, #f8f9fc 0%, #f1f3f7 100%)" }}
      >
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--border-strong) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Top logo */}
        <div className="relative z-10 px-10 pt-10">
          <AuthLogo />
        </div>

        {/* Center carousel */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-10">
          <ProductCarousel />
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-center py-5 bg-[#FAFAFA] border-b" style={{ borderColor: "#E0E0E0" }}>
        <AuthLogo />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center bg-[#FAFAFA] overflow-y-auto">
        <div className="w-full max-w-[480px] px-6 py-10 sm:px-10 my-auto">
          {/* Desktop logo inside form area */}
          <div className="hidden lg:flex justify-center mb-8">
            <AuthLogo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function ProductCarousel() {
  const [active, setActive] = useState(0);

  const goTo = useCallback((index: number) => {
    setActive(index);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-sm text-center">
      {/* Slide content */}
      <div className="relative h-52 flex items-center justify-center">
        {SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out"
            style={{
              opacity: active === index ? 1 : 0,
              transform: active === index ? "translateX(0) scale(1)" : "translateX(20px) scale(0.95)",
              pointerEvents: active === index ? "auto" : "none",
            }}
          >
            {/* Icon container */}
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center mb-5 border"
              style={{
                background: "linear-gradient(135deg, var(--slipwise-navy) 0%, var(--slipwise-purple) 100%)",
                color: "white",
                borderColor: "rgba(255,255,255,0.2)",
              }}
            >
              <span className="text-2xl font-bold">{String(slide.id)}</span>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
              {slide.title}
            </h3>

            {/* Description */}
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: "var(--text-muted)" }}>
              {slide.description}
            </p>
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className="rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            style={{
              width: active === index ? 24 : 8,
              height: 8,
              background: active === index ? "var(--slipwise-navy)" : "var(--border-strong)",
            }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
