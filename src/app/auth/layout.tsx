import { AuthLogo } from "@/features/auth/components/auth-logo";

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

        {/* Center workflow illustration */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-10">
          <WorkflowIllustration />
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
      <div className="lg:hidden flex items-center justify-center py-6 bg-white border-b border-[var(--border-soft)]">
        <AuthLogo />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
          <div className="w-full max-w-[420px] mx-auto lg:mx-0 lg:ml-auto lg:mr-auto xl:mr-20">
            {/* Desktop logo inside form area */}
            <div className="hidden lg:flex mb-10">
              <AuthLogo />
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowIllustration() {
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

      {/* Card 1 - New account */}
      <div className="flex justify-start mb-8">
        <div className="bg-white/80 backdrop-blur-sm border border-[var(--border-soft)] rounded-xl p-4 shadow-sm w-44">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center border border-[var(--border-soft)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>New account</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Action</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 2 - Send verification email */}
      <div className="flex justify-center mb-8">
        <div className="bg-white/80 backdrop-blur-sm border border-[var(--border-soft)] rounded-xl p-4 shadow-sm w-52">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center border border-[var(--border-soft)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Send verification email</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Trigger</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3 & 4 row */}
      <div className="flex justify-between gap-4">
        <div className="bg-white/80 backdrop-blur-sm border border-[var(--border-soft)] rounded-xl p-4 shadow-sm w-44">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--state-success-soft)] flex items-center justify-center border border-[var(--state-success-soft)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--state-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Successfully Verified</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Action</p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-[var(--border-soft)] rounded-xl p-4 shadow-sm w-36">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[var(--surface-subtle)] flex items-center justify-center border border-[var(--border-soft)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Resend</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Action</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
