import {
  FileText,
  Paintbrush,
  RefreshCcw,
  Users,
  BarChart3,
  Shield,
} from "lucide-react";

const sections = [
  {
    icon: FileText,
    title: "Document Creation",
    description:
      "Create professional invoices, vouchers, and salary slips with our intuitive editor. Choose from pre-built templates or customize your own. Auto-numbering, GST calculations, and multi-currency support come built-in.",
    highlights: [
      "GST-compliant invoice templates",
      "Payment, receipt & journal vouchers",
      "Detailed salary slips with earnings & deductions",
      "Auto-numbering and sequencing",
    ],
  },
  {
    icon: Paintbrush,
    title: "PDF Studio",
    description:
      "Our full-featured PDF engine generates pixel-perfect documents. Add watermarks, custom branding, headers, footers, and export in bulk. Every PDF is production-ready.",
    highlights: [
      "Custom watermarks and branding",
      "Bulk PDF export",
      "Metadata embedding",
      "Print-optimized layouts",
    ],
  },
  {
    icon: RefreshCcw,
    title: "Automation",
    description:
      "Set up recurring invoices and schedule document generation. Slipwise handles the repetitive work so you can focus on your business.",
    highlights: [
      "Recurring invoice schedules",
      "Automated reminders",
      "Template-based generation",
      "Cron-based scheduling engine",
    ],
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Invite team members, assign roles, and collaborate on documents. Role-based access control keeps your data secure while enabling teamwork.",
    highlights: [
      "Multi-user organizations",
      "Role-based permissions (Admin, Member, Viewer)",
      "Activity audit logs",
      "Document sharing links",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics",
    description:
      "Track document generation trends, monitor revenue, and get insights into team activity. Make data-driven decisions with our built-in analytics dashboard.",
    highlights: [
      "Document generation trends",
      "Revenue tracking",
      "Team activity monitoring",
      "Export analytics data",
    ],
  },
  {
    icon: Shield,
    title: "Security",
    description:
      "Your data is encrypted at rest and in transit. We use Supabase for authentication, row-level security for data isolation, and comprehensive audit logging.",
    highlights: [
      "End-to-end encryption",
      "Row-level security",
      "Comprehensive audit logs",
      "SOC 2 compliant infrastructure",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="bg-white">
      {/* Header */}
      <section className="py-20 text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          Everything you need
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-gray-600">
          Slipwise is the all-in-one platform for professional document
          operations — from creation to delivery.
        </p>
      </section>

      {/* Feature sections */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="space-y-24">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            const isReversed = idx % 2 === 1;
            return (
              <div
                key={section.title}
                className={`flex flex-col items-center gap-12 lg:flex-row ${
                  isReversed ? "lg:flex-row-reverse" : ""
                }`}
              >
                {/* Content */}
                <div className="flex-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50">
                    <Icon className="h-6 w-6 text-red-600" />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-gray-900">
                    {section.title}
                  </h2>
                  <p className="mt-4 leading-7 text-gray-600">
                    {section.description}
                  </p>
                  <ul className="mt-6 space-y-2">
                    {section.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Screenshot placeholder */}
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex h-64 w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400">
                    Screenshot: {section.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
