"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthLogo } from "@/features/auth/components/auth-logo";

const SLIDES = [
  {
    id: 1,
    title: "Document Automation",
    description: "Design templates, set sequences, and generate documents at scale.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
      </svg>
    ),
  },
  {
    id: 2,
    title: "Payslip Generation",
    description: "Generate compliant payslips with PF, ESI, and tax breakdowns automatically.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
        <line x1="7" x2="7.01" y1="15" y2="15" />
        <line x1="11" x2="13" y1="15" y2="15" />
      </svg>
    ),
  },
  {
    id: 3,
    title: "GST Invoicing",
    description: "Create GST-compliant invoices with e-invoice integration and real-time validation.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: 4,
    title: "Books & Accounting",
    description: "Track ledgers, run trial balances, and reconcile transactions effortlessly.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
  {
    id: 5,
    title: "Vendor Compliance",
    description: "Match GSTR-2B data, manage vendor bills, and stay audit-ready.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 6,
    title: "Financial Insights",
    description: "Get real-time dashboards, forecasts, and actionable business intelligence.",
    icon: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
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
      <div className="lg:hidden flex items-center justify-center py-6 bg-white border-b border-[var(--border-soft)]">
        <AuthLogo />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center bg-white overflow-y-auto">
        <div className="w-full max-w-[420px] px-6 py-10 sm:px-10 my-auto">
          {/* Desktop logo inside form area */}
          <div className="hidden lg:flex justify-center mb-10">
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
      <div className="relative h-64 flex items-center justify-center">
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
              className="h-20 w-20 rounded-2xl flex items-center justify-center mb-6 shadow-sm border"
              style={{
                background: "linear-gradient(135deg, var(--slipwise-navy) 0%, var(--slipwise-purple) 100%)",
                color: "white",
                borderColor: "rgba(255,255,255,0.2)",
              }}
            >
              {slide.icon}
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>
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
      <div className="flex items-center justify-center gap-2 mt-4">
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
