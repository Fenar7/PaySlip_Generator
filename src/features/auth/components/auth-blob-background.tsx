"use client";

export function AuthBlobBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none hidden lg:block">
      {/* SVG gooey filter */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="24" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 28 -12"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      {/* Blob container — centered behind the form area */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]"
        style={{ filter: "url(#goo)" }}
      >
        {/* Blob 1 — large, slow drift */}
        <div
          className="absolute top-[20%] left-[25%] w-72 h-72 animate-blob-morph-1"
          style={{
            background: "radial-gradient(circle at 30% 30%, rgba(220,38,38,0.14), rgba(185,28,28,0.08))",
          }}
        />
        {/* Blob 2 — medium, offset drift */}
        <div
          className="absolute top-[35%] left-[50%] w-56 h-56 animate-blob-morph-2"
          style={{
            background: "radial-gradient(circle at 40% 40%, rgba(220,38,38,0.12), rgba(153,27,27,0.06))",
          }}
        />
        {/* Blob 3 — smaller, faster drift */}
        <div
          className="absolute top-[45%] left-[20%] w-48 h-48 animate-blob-morph-3"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(220,38,38,0.10), rgba(185,28,28,0.05))",
          }}
        />
        {/* Blob 4 — accent drift */}
        <div
          className="absolute top-[30%] left-[40%] w-40 h-40 animate-blob-morph-4"
          style={{
            background: "radial-gradient(circle at 35% 35%, rgba(220,38,38,0.08), rgba(153,27,27,0.04))",
          }}
        />
      </div>

      <style jsx>{`
        @keyframes blob-morph-1 {
          0%, 100% {
            border-radius: 60% 40% 55% 45% / 55% 45% 60% 40%;
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            border-radius: 45% 55% 40% 60% / 50% 55% 45% 55%;
            transform: translate(30px, -20px) rotate(5deg);
          }
          50% {
            border-radius: 55% 45% 60% 40% / 45% 55% 40% 60%;
            transform: translate(-10px, 30px) rotate(-3deg);
          }
          75% {
            border-radius: 50% 50% 45% 55% / 60% 40% 55% 45%;
            transform: translate(20px, 10px) rotate(2deg);
          }
        }
        @keyframes blob-morph-2 {
          0%, 100% {
            border-radius: 45% 55% 50% 50% / 50% 45% 55% 50%;
            transform: translate(0, 0) rotate(0deg);
          }
          33% {
            border-radius: 55% 45% 40% 60% / 45% 55% 50% 50%;
            transform: translate(-25px, 25px) rotate(-5deg);
          }
          66% {
            border-radius: 40% 60% 55% 45% / 55% 40% 45% 55%;
            transform: translate(15px, -15px) rotate(4deg);
          }
        }
        @keyframes blob-morph-3 {
          0%, 100% {
            border-radius: 50% 50% 40% 60% / 40% 60% 50% 50%;
            transform: translate(0, 0) rotate(0deg);
          }
          20% {
            border-radius: 60% 40% 50% 50% / 55% 45% 40% 60%;
            transform: translate(20px, 20px) rotate(3deg);
          }
          50% {
            border-radius: 45% 55% 60% 40% / 50% 50% 55% 45%;
            transform: translate(-15px, -25px) rotate(-4deg);
          }
          80% {
            border-radius: 55% 45% 45% 55% / 45% 55% 60% 40%;
            transform: translate(10px, 15px) rotate(2deg);
          }
        }
        @keyframes blob-morph-4 {
          0%, 100% {
            border-radius: 55% 45% 50% 50% / 50% 55% 45% 55%;
            transform: translate(0, 0) rotate(0deg);
          }
          30% {
            border-radius: 45% 55% 55% 45% / 55% 45% 50% 50%;
            transform: translate(-20px, 10px) rotate(-3deg);
          }
          60% {
            border-radius: 50% 50% 45% 55% / 45% 55% 55% 45%;
            transform: translate(25px, -20px) rotate(5deg);
          }
        }
        .animate-blob-morph-1 {
          animation: blob-morph-1 18s ease-in-out infinite;
        }
        .animate-blob-morph-2 {
          animation: blob-morph-2 16s ease-in-out infinite;
        }
        .animate-blob-morph-3 {
          animation: blob-morph-3 14s ease-in-out infinite;
        }
        .animate-blob-morph-4 {
          animation: blob-morph-4 20s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
