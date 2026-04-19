import { ReactNode } from "react";

export const metadata = {
  title: "Help Center — Slipwise One",
  description: "Find answers to common questions about Slipwise One",
};

export default function HelpLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
