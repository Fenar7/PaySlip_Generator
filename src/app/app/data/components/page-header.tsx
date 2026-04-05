import Link from "next/link";

interface PageHeaderProps {
  title: string;
  description?: string;
  addLink?: string;
  addLabel?: string;
}

export function PageHeader({ title, description, addLink, addLabel }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {addLink && (
        <Link
          href={addLink}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          {addLabel || "Add New"}
        </Link>
      )}
    </div>
  );
}
