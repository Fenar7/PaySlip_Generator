"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthLogo } from "@/features/auth/components/auth-logo";

const SLIDES = [
  {
    id: 1,
    title: "Document Automation",
    description: "Design templates, set sequences, and generate documents at scale.",
    accent: "#C05092",
  },
  {
    id: 2,
    title: "Payslip Generation",
    description: "Generate compliant payslips with PF, ESI, and tax breakdowns automatically.",
    accent: "#DC2626",
  },
  {
    id: 3,
    title: "GST Invoicing",
    description: "Create GST-compliant invoices with e-invoice integration and real-time validation.",
    accent: "#16294D",
  },
  {
    id: 4,
    title: "Books & Accounting",
    description: "Track ledgers, run trial balances, and reconcile transactions effortlessly.",
    accent: "#3B82F6",
  },
  {
    id: 5,
    title: "Vendor Compliance",
    description: "Match GSTR-2B data, manage vendor bills, and stay audit-ready.",
    accent: "#10B981",
  },
  {
    id: 6,
    title: "Financial Insights",
    description: "Get real-time dashboards, forecasts, and actionable business intelligence.",
    accent: "#8B5CF6",
  },
];

const SLIDE_INTERVAL_MS = 5000;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branded panel — creative gradient + floating cards */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-[45%] flex-col overflow-hidden bg-[#0f172a]">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full opacity-30 blur-[100px] animate-pulse"
            style={{ background: "radial-gradient(circle, #C05092 0%, transparent 70%)" }}
          />
          <div
            className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full opacity-25 blur-[100px] animate-pulse"
            style={{ background: "radial-gradient(circle, #3B82F6 0%, transparent 70%)", animationDelay: "2s" }}
          />
          <div
            className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] rounded-full opacity-20 blur-[100px] animate-pulse"
            style={{ background: "radial-gradient(circle, #DC2626 0%, transparent 70%)", animationDelay: "4s" }}
          />
        </div>

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Top logo */}
        <div className="relative z-10 px-10 pt-10">
          <AuthLogo />
        </div>

        {/* Center creative composition */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-10">
          <CreativeComposition />
        </div>

        {/* Bottom tagline */}
        <div className="relative z-10 px-10 pb-10">
          <ProductCarousel />
        </div>
      </div>

      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-center py-5 bg-[#FAFAFA] border-b border-[#E0E0E0]">
        <AuthLogo />
      </div>

      {/* Right form panel — Material Light */}
      <div className="flex-1 flex flex-col items-center bg-[#FAFAFA] overflow-y-auto">
        <div className="w-full max-w-[440px] px-6 py-10 sm:px-10 my-auto">
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

function CreativeComposition() {
  return (
    <div className="relative w-full max-w-md aspect-square">
      {/* Central floating card — Document preview */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 rounded-2xl p-5 shadow-2xl border border-white/10 backdrop-blur-xl"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-lg bg-[#DC2626] flex items-center justify-center text-white text-xs font-bold">S</div>
          <div>
            <div className="h-2 w-20 rounded bg-white/20" />
            <div className="h-1.5 w-12 rounded bg-white/10 mt-1.5" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-1.5 w-full rounded bg-white/10" />
          <div className="h-1.5 w-[85%] rounded bg-white/10" />
          <div className="h-1.5 w-[60%] rounded bg-white/10" />
        </div>
        <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
          <div className="h-2 w-14 rounded bg-white/15" />
          <div className="h-5 w-16 rounded-md bg-[#DC2626]/80" />
        </div>
      </div>

      {/* Floating card top-right — Chart */}
      <div
        className="absolute top-[8%] right-[5%] w-36 rounded-xl p-3 shadow-xl border border-white/10 backdrop-blur-xl"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div className="h-1.5 w-16 rounded bg-white/20 mb-3" />
        <div className="flex items-end gap-1.5 h-10">
          <div className="flex-1 rounded-t bg-[#3B82F6]/60 h-[40%]" />
          <div className="flex-1 rounded-t bg-[#3B82F6]/60 h-[70%]" />
          <div className="flex-1 rounded-t bg-[#DC2626]/60 h-[55%]" />
          <div className="flex-1 rounded-t bg-[#3B82F6]/60 h-[90%]" />
          <div className="flex-1 rounded-t bg-[#3B82F6]/60 h-[65%]" />
        </div>
      </div>

      {/* Floating card bottom-left — Checklist */}
      <div
        className="absolute bottom-[12%] left-[0%] w-40 rounded-xl p-3 shadow-xl border border-white/10 backdrop-blur-xl"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div className="h-1.5 w-20 rounded bg-white/20 mb-3" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-[#10B981]/60" />
            <div className="h-1.5 flex-1 rounded bg-white/10" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-[#10B981]/60" />
            <div className="h-1.5 flex-1 rounded bg-white/10" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-white/10" />
            <div className="h-1.5 flex-1 rounded bg-white/10" />
          </div>
        </div>
      </div>

      {/* Floating badge top-left */}
      <div
        className="absolute top-[15%] left-[8%] px-3 py-1.5 rounded-full shadow-lg border border-white/10 backdrop-blur-xl"
        style={{ background: "rgba(192,80,146,0.25)" }}
      >
        <div className="h-1.5 w-14 rounded bg-white/40" />
      </div>

      {/* Decorative ring */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-white/5"
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-white/[0.03]"
      />
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
    <div className="text-center">
      {/* Slide text */}
      <div className="relative h-16 mb-3">
        {SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className="absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-out"
            style={{
              opacity: active === index ? 1 : 0,
              transform: active === index ? "translateY(0)" : "translateY(12px)",
              pointerEvents: active === index ? "auto" : "none",
            }}
          >
            <h3 className="text-lg font-semibold tracking-tight text-white">
              {slide.title}
            </h3>
            <p className="text-sm leading-relaxed text-white/50 mt-1 max-w-xs">
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
            className="rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            style={{
              width: active === index ? 24 : 8,
              height: 8,
              background: active === index ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.25)",
            }}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
