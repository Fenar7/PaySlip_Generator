"use client";

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
          <ProductIllustration />
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

function ProductIllustration() {
  return (
    <div className="relative w-full max-w-md">
      {/* SVG connectors */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 400 320"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d="M110 80 C 160 80, 160 140, 200 140"
          stroke="var(--border-default)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          fill="none"
        />
        <path
          d="M200 180 C 200 220, 120 220, 90 250"
          stroke="var(--border-default)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          fill="none"
        />
        <path
          d="M200 180 C 200 220, 280 220, 310 250"
          stroke="var(--border-default)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          fill="none"
        />
      </svg>

      {/* Card 1 - Invoices */}
      <div className="flex justify-start mb-8">
        <div className="bg-white/80 backdrop-blur-sm border border-[var(--border-soft)] rounded-xl p-4 w-48">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center border border-[var(--border-soft)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
                <line x1="10" x2="8" y1="9" y2="9" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Invoices</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Create &amp; Track</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2 - Vouchers */}
      <div className="flex justify-center mb-8">
        <div className="bg-white/80 backdrop-blur-sm border border-[var(--border-soft)] rounded-xl p-4 w-52">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center border border-[var(--border-soft)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Vouchers</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Manage &amp; Reconcile</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3 & 4 row */}
      <div className="flex justify-between gap-4">
        <div className="bg-white/80 backdrop-blur-sm border border-[var(--border-soft)] rounded-xl p-4 w-44">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--state-success-soft)] flex items-center justify-center border border-[var(--state-success-soft)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--state-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="12" x="2" y="6" rx="2" />
                <circle cx="12" cy="12" r="2" />
                <path d="M6 12h.01M18 12h.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Salary Slips</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Automate Payroll</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-[var(--border-soft)] rounded-xl p-4 w-36">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center border border-[var(--border-soft)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Reports</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Insights</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
