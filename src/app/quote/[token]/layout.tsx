export const metadata = {
  title: "Quote | Slipwise",
};

export default function PublicQuoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center">
        <p className="text-sm text-slate-400">
          Powered by{" "}
          <a
            href="https://slipwise.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-500 hover:text-slate-700"
          >
            Slipwise
          </a>
        </p>
      </footer>
    </div>
  );
}
