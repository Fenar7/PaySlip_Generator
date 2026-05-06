"use client";

import { useEffect, useState } from "react";
import { AuthLogo } from "@/features/auth/components/auth-logo";
import { AuthBlobBackground } from "@/features/auth/components/auth-blob-background";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branded panel */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-[45%] flex-col justify-between overflow-hidden"
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

        {/* Center product slides */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-10">
          <ProductSlides />
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 px-10 pb-10 text-center">
          <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Automate Your Workflow
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Empower teams to streamline tasks and automate processes
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-4">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--border-strong)]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--border-strong)]" />
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-center py-5 bg-white border-b" style={{ borderColor: "#E0E0E0" }}>
        <AuthLogo />
      </div>

      {/* Right form panel */}
      <div className="relative flex-1 flex flex-col items-center bg-white overflow-y-auto">
        {/* Liquid blob background behind form */}
        <AuthBlobBackground />

        <div className="relative z-10 w-full max-w-[520px] px-6 py-10 sm:px-10 my-auto">
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

const slides = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" x2="8" y1="13" y2="13" />
        <line x1="16" x2="8" y1="17" y2="17" />
        <line x1="10" x2="8" y1="9" y2="9" />
      </svg>
    ),
    title: "Smart Invoicing",
    description: "Create, send, and track professional invoices in seconds with automated reminders and payment collection.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
    title: "Digital Vouchers",
    description: "Generate and manage vouchers with automated reconciliation, tracking, and approval workflows.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="12" x="2" y="6" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
      </svg>
    ),
    title: "Salary Slips",
    description: "Automated payroll documents with compliance-ready formats, tax calculations, and direct disbursement.",
  },
];

function ProductSlides() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-sm">
      <div className="relative h-[200px]">
        {slides.map((slide, index) => (
          <div
            key={slide.title}
            className="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-in-out"
            style={{
              opacity: active === index ? 1 : 0,
              transform: active === index ? "translateY(0) scale(1)" : "translateY(12px) scale(0.96)",
              pointerEvents: active === index ? "auto" : "none",
            }}
          >
            <div className="bg-white/80 backdrop-blur-sm border border-[var(--border-soft)] rounded-2xl p-6 w-full shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center border border-[var(--border-soft)]" style={{ color: "var(--text-muted)" }}>
                  {slide.icon}
                </div>
                <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                  {slide.title}
                </h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {slide.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 mt-5">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setActive(index)}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: active === index ? 24 : 8,
              backgroundColor: active === index ? "var(--text-muted)" : "var(--border-strong)",
            }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
