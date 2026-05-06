"use client";

export function AuthBlobBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
      {/* SVG gooey filter — merges overlapping circles into organic liquid shapes */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="20" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Blob container with gooey filter */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px]"
        style={{ filter: "url(#goo)" }}
      >
        {/* Blob 1 — large primary */}
        <div
          className="absolute top-[15%] left-[20%] w-64 h-64 animate-blob-morph-1 rounded-full"
          style={{ background: "rgba(220, 38, 38, 0.65)" }}
        />
        {/* Blob 2 — medium secondary */}
        <div
          className="absolute top-[35%] left-[55%] w-56 h-56 animate-blob-morph-2 rounded-full"
          style={{ background: "rgba(185, 28, 28, 0.55)" }}
        />
        {/* Blob 3 — medium tertiary */}
        <div
          className="absolute top-[50%] left-[15%] w-48 h-48 animate-blob-morph-3 rounded-full"
          style={{ background: "rgba(220, 38, 38, 0.50)" }}
        />
        {/* Blob 4 — small accent */}
        <div
          className="absolute top-[25%] left-[45%] w-44 h-44 animate-blob-morph-4 rounded-full"
          style={{ background: "rgba(153, 27, 27, 0.45)" }}
        />
        {/* Blob 5 — extra accent for more organic complexity */}
        <div
          className="absolute top-[60%] left-[50%] w-40 h-40 animate-blob-morph-1 rounded-full"
          style={{
            background: "rgba(220, 38, 38, 0.40)",
            animationDelay: "-8s",
          }}
        />
      </div>

      {/* Soft blur overlay to tone down edges */}
      <div className="absolute inset-0 backdrop-blur-[2px]" />
    </div>
  );
}
