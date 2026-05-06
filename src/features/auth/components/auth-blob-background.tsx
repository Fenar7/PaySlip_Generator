"use client";

export function AuthBlobBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_52%,rgba(220,38,38,0.10),transparent_18%),radial-gradient(circle_at_66%_48%,rgba(248,113,113,0.08),transparent_16%),radial-gradient(circle_at_52%_62%,rgba(185,28,28,0.07),transparent_18%)]" />

      <div className="absolute left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2">
        <div
          className="auth-blob-shape-primary absolute left-[18%] top-[14%] h-[20rem] w-[21rem]"
          style={{
            background:
              "radial-gradient(circle at 34% 30%, rgba(255, 241, 242, 0.78) 0%, rgba(252, 165, 165, 0.38) 18%, rgba(220, 38, 38, 0.86) 58%, rgba(127, 29, 29, 0.34) 100%)",
            filter: "blur(66px)",
          }}
        />

        <div
          className="auth-blob-shape-secondary absolute left-[46%] top-[26%] h-[18rem] w-[19rem]"
          style={{
            background:
              "radial-gradient(circle at 44% 28%, rgba(255, 241, 242, 0.68) 0%, rgba(248, 113, 113, 0.28) 18%, rgba(220, 38, 38, 0.78) 56%, rgba(153, 27, 27, 0.28) 100%)",
            filter: "blur(58px)",
          }}
        />

        <div
          className="auth-blob-shape-tertiary absolute left-[28%] top-[44%] h-[17rem] w-[18rem]"
          style={{
            background:
              "radial-gradient(circle at 48% 38%, rgba(255, 255, 255, 0.54) 0%, rgba(252, 165, 165, 0.20) 16%, rgba(220, 38, 38, 0.62) 54%, rgba(127, 29, 29, 0.24) 100%)",
            filter: "blur(54px)",
          }}
        />

        <div
          className="auth-blob-shape-accent absolute left-[54%] top-[50%] h-[12rem] w-[13rem]"
          style={{
            background:
              "radial-gradient(circle at 36% 34%, rgba(255,255,255,0.48) 0%, rgba(252, 165, 165, 0.16) 22%, rgba(220, 38, 38, 0.48) 62%, rgba(153, 27, 27, 0.18) 100%)",
            filter: "blur(46px)",
          }}
        />
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_54%,rgba(255,255,255,0),rgba(255,255,255,0.16)_56%,rgba(255,255,255,0.28)_100%)]" />
    </div>
  );
}
