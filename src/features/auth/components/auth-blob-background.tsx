"use client";

export function AuthBlobBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
      {/* Blob 1 — large, slow drift */}
      <div
        className="absolute top-[15%] left-[20%] w-80 h-80 animate-blob-morph-1"
        style={{
          background: "#DC2626",
          filter: "blur(80px)",
          opacity: 0.18,
        }}
      />
      {/* Blob 2 — medium, offset drift */}
      <div
        className="absolute top-[40%] left-[55%] w-64 h-64 animate-blob-morph-2"
        style={{
          background: "#B91C1C",
          filter: "blur(70px)",
          opacity: 0.14,
        }}
      />
      {/* Blob 3 — smaller, faster drift */}
      <div
        className="absolute top-[55%] left-[15%] w-52 h-52 animate-blob-morph-3"
        style={{
          background: "#DC2626",
          filter: "blur(60px)",
          opacity: 0.12,
        }}
      />
      {/* Blob 4 — accent drift */}
      <div
        className="absolute top-[25%] left-[45%] w-44 h-44 animate-blob-morph-4"
        style={{
          background: "#991B1B",
          filter: "blur(50px)",
          opacity: 0.10,
        }}
      />
    </div>
  );
}
