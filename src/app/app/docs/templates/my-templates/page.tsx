"use client";

import { useEffect, useState, useTransition } from "react";
import { getInstalledTemplates } from "../marketplace/actions";

type Tab = "installed" | "custom";

interface InstalledTemplate {
  purchaseId: string;
  templateId: string;
  revisionId: string;
  revisionVersion: string;
  displayName: string;
  description: string;
  templateType: string;
  publisherDisplayName: string;
  previewImageUrl: string;
  installedAt: string;
}

export default function MyTemplatesPage() {
  const [tab, setTab] = useState<Tab>("installed");
  const [installed, setInstalled] = useState<InstalledTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      const result = await getInstalledTemplates();
      if (result.success) {
        setInstalled(result.data);
        setError(null);
      } else {
        setInstalled([]);
        setError(result.error);
      }
    }

    startTransition(() => {
      load();
    });
  }, []);

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Templates</h1>
        <p className="text-muted-foreground mt-1">
          Manage your installed and custom templates
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["installed", "custom"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "border-primary text-primary"
                : "text-muted-foreground hover:text-foreground border-transparent"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "installed" && (
        <div>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : isPending ? (
            <div className="text-muted-foreground py-12 text-center">
              Loading installed templates...
            </div>
          ) : installed.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">
              No installed templates yet. Browse the{" "}
              <a
                href="/app/docs/templates/marketplace"
                className="text-primary hover:underline"
              >
                marketplace
              </a>{" "}
              to get started.
            </div>
          ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {installed.map((item) => (
                  <div
                    key={item.purchaseId}
                    className="bg-card border-border rounded-lg border p-4"
                  >
                    <h3 className="text-sm font-semibold">
                      {item.displayName}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {item.templateType}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Publisher: {item.publisherDisplayName}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Revision: v{item.revisionVersion}
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      Installed{" "}
                      {new Date(item.installedAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
          )}
        </div>
      )}

      {tab === "custom" && (
        <div className="text-muted-foreground py-12 text-center">
          Custom templates coming soon. You can{" "}
          <a
            href="/app/docs/templates/publish"
            className="text-primary hover:underline"
          >
            publish
          </a>{" "}
          your own templates to the marketplace.
        </div>
      )}
    </div>
  );
}
