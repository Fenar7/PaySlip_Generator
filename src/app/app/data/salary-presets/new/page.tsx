import { SalaryPresetForm } from "../components/salary-preset-form";

export const metadata = { title: "Create Preset | Slipwise" };

export default function NewPresetPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Create Salary Preset</h1>
        <SalaryPresetForm />
      </div>
    </div>
  );
}
