import { notFound } from "next/navigation";
import { getSalaryPreset } from "../../salary-preset-actions";
import { SalaryPresetForm } from "../components/salary-preset-form";

export const metadata = { title: "Edit Preset | Slipwise" };

export default async function EditPresetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const preset = await getSalaryPreset(id);
  if (!preset) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Edit Preset</h1>
        <SalaryPresetForm preset={preset} />
      </div>
    </div>
  );
}
