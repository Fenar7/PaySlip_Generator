import type { Metadata } from "next";
import { DeletePagesWorkspace } from "@/features/docs/pdf-studio/components/delete-pages/delete-pages-workspace";

export const metadata: Metadata = {
  title: "Delete Pages | PDF Studio",
};

export default function DeletePagesPage() {
  return <DeletePagesWorkspace />;
}
