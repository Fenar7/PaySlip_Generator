"use client";

import { useEffect, useState, useCallback } from "react";

interface OpenApiSpec {
  info: { title: string; version: string; description: string };
  tags: Array<{ name: string; description: string }>;
  paths: Record<string, Record<string, PathItem>>;
  servers: Array<{ url: string }>;
}

interface PathItem {
  summary: string;
  tags?: string[];
  parameters?: Array<{
    name: string;
    in: string;
    required?: boolean;
    schema?: { type: string; default?: unknown; enum?: string[] };
    description?: string;
  }>;
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: { properties?: Record<string, { type: string; description?: string }> } }>;
  };
  responses: Record<string, { description: string }>;
}

const METHOD_COLORS: Record<string, string> = {
  get: "bg-blue-100 text-blue-800",
  post: "bg-green-100 text-green-800",
  patch: "bg-amber-100 text-amber-800",
  put: "bg-amber-100 text-amber-800",
  delete: "bg-red-100 text-red-800",
};

function MethodBadge({ method }: { method: string }) {
  const colors = METHOD_COLORS[method.toLowerCase()] ?? "bg-slate-100 text-slate-800";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase font-mono ${colors}`}>
      {method}
    </span>
  );
}

function EndpointCard({
  path,
  method,
  item,
  baseUrl,
}: {
  path: string;
  method: string;
  item: PathItem;
  baseUrl: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [tryItOut, setTryItOut] = useState(false);
  const [response, setResponse] = useState<{ status: number; body: string } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [token, setToken] = useState("");
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState(
    item.requestBody ? JSON.stringify({ note: "Edit this JSON body" }, null, 2) : ""
  );

  const pathParams = (item.parameters ?? []).filter((p) => p.in === "path");
  const queryParams = (item.parameters ?? []).filter((p) => p.in === "query");

  function buildUrl(): string {
    let url = baseUrl + path;
    for (const [k, v] of Object.entries(paramValues)) {
      if (v) url = url.replace(`{${k}}`, encodeURIComponent(v));
    }
    const qp = queryParams
      .map((p) => paramValues[p.name] ? `${p.name}=${encodeURIComponent(paramValues[p.name])}` : null)
      .filter(Boolean);
    if (qp.length) url += "?" + qp.join("&");
    return url;
  }

  async function execute() {
    setExecuting(true);
    setResponse(null);
    const url = buildUrl();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(url, {
        method: method.toUpperCase(),
        headers,
        body: ["post", "patch", "put"].includes(method.toLowerCase()) && bodyText
          ? bodyText
          : undefined,
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}
      setResponse({ status: res.status, body: pretty });
    } catch (err) {
      setResponse({ status: 0, body: String(err) });
    }
    setExecuting(false);
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
        onClick={() => setExpanded((v) => !v)}
      >
        <MethodBadge method={method} />
        <code className="text-sm font-mono text-slate-700 flex-1">{path}</code>
        <span className="text-sm text-slate-500 hidden sm:block">{item.summary}</span>
        <span className="text-slate-400 text-xs ml-auto">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4">
          <p className="text-sm text-slate-600">{item.summary}</p>

          {pathParams.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Path Parameters</h4>
              <div className="space-y-2">
                {pathParams.map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <code className="text-xs font-mono text-slate-700 w-28 shrink-0">{p.name}</code>
                    <span className="text-xs text-slate-400 w-16 shrink-0">{p.schema?.type}</span>
                    {tryItOut && (
                      <input
                        type="text"
                        placeholder={`Enter ${p.name}`}
                        value={paramValues[p.name] ?? ""}
                        onChange={(e) => setParamValues((v) => ({ ...v, [p.name]: e.target.value }))}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {queryParams.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Query Parameters</h4>
              <div className="space-y-2">
                {queryParams.map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <code className="text-xs font-mono text-slate-700 w-28 shrink-0">{p.name}</code>
                    <span className="text-xs text-slate-400 w-16 shrink-0">{p.schema?.type}</span>
                    {p.schema?.enum && (
                      <span className="text-xs text-slate-400">
                        one of: {p.schema.enum.join(", ")}
                      </span>
                    )}
                    {tryItOut && (
                      <input
                        type="text"
                        placeholder={p.schema?.default != null ? String(p.schema.default) : ""}
                        value={paramValues[p.name] ?? ""}
                        onChange={(e) => setParamValues((v) => ({ ...v, [p.name]: e.target.value }))}
                        className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {item.requestBody && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Request Body</h4>
              {tryItOut ? (
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono h-32 focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-xs text-slate-500">JSON body required. Click &quot;Try It Out&quot; to edit.</p>
              )}
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Responses</h4>
            <div className="space-y-1">
              {Object.entries(item.responses).map(([code, resp]) => (
                <div key={code} className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                      code.startsWith("2")
                        ? "bg-green-100 text-green-700"
                        : code.startsWith("4")
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {code}
                  </span>
                  <span className="text-xs text-slate-600">{resp.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Try It Out */}
          <div className="pt-2 border-t border-slate-100">
            {!tryItOut ? (
              <button
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                onClick={() => setTryItOut(true)}
              >
                Try It Out →
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Authorization Token
                  </label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="slw_live_…"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    onClick={execute}
                    disabled={executing}
                  >
                    {executing ? "Executing…" : "Execute"}
                  </button>
                  <button
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                    onClick={() => {
                      setTryItOut(false);
                      setResponse(null);
                      setParamValues({});
                    }}
                  >
                    Cancel
                  </button>
                </div>
                {response && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                          response.status >= 200 && response.status < 300
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {response.status || "Error"}
                      </span>
                      <span className="text-xs text-slate-500">Response</span>
                    </div>
                    <pre className="bg-slate-900 text-green-400 text-xs font-mono p-3 rounded-lg overflow-auto max-h-64 whitespace-pre-wrap">
                      {response.body}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/v1/openapi.json")
      .then((r) => r.json())
      .then((data) => {
        setSpec(data);
        if (data.tags?.length) setActiveTag(data.tags[0].name);
      })
      .finally(() => setLoading(false));
  }, []);

  const baseUrl = spec?.servers?.[0]?.url ?? "/api/v1";

  const filteredPaths = useCallback(
    (tag: string) => {
      if (!spec) return [];
      return Object.entries(spec.paths).flatMap(([path, methods]) =>
        Object.entries(methods)
          .filter(([, item]) => {
            const matchesTag = !item.tags || item.tags.includes(tag);
            const matchesSearch =
              !search ||
              path.toLowerCase().includes(search.toLowerCase()) ||
              item.summary?.toLowerCase().includes(search.toLowerCase());
            return matchesTag && matchesSearch;
          })
          .map(([method, item]) => ({ path, method, item }))
      );
    },
    [spec, search]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        Loading API specification…
      </div>
    );
  }

  if (!spec) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        Failed to load API specification.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{spec.info.title}</h1>
            <p className="text-xs text-slate-500">
              Version {spec.info.version} — Base URL:{" "}
              <code className="font-mono">{baseUrl}</code>
            </p>
          </div>
          <a
            href="/app/settings/developer/tokens"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Manage API Tokens →
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-48 shrink-0 hidden md:block">
          <div className="sticky top-20 space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase mb-3 px-2">
              Resources
            </p>
            {spec.tags.map((tag) => (
              <button
                key={tag.name}
                onClick={() => setActiveTag(tag.name)}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition ${
                  activeTag === tag.name
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 space-y-6 min-w-0">
          {/* Auth info */}
          <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 text-sm text-blue-800 space-y-1">
            <p className="font-medium">Authentication</p>
            <p>
              All endpoints require a valid API key:{" "}
              <code className="bg-blue-100 px-1 rounded font-mono text-xs">
                Authorization: Bearer slw_live_…
              </code>
            </p>
          </div>

          {/* Search */}
          <input
            type="search"
            placeholder="Search endpoints…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />

          {/* Mobile tag selector */}
          <div className="md:hidden">
            <select
              value={activeTag ?? ""}
              onChange={(e) => setActiveTag(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {spec.tags.map((tag) => (
                <option key={tag.name} value={tag.name}>
                  {tag.name}
                </option>
              ))}
            </select>
          </div>

          {/* Endpoints */}
          {activeTag && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">{activeTag}</h2>
                <span className="text-sm text-slate-400">
                  {filteredPaths(activeTag).length} endpoint
                  {filteredPaths(activeTag).length !== 1 ? "s" : ""}
                </span>
              </div>
              {filteredPaths(activeTag).length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No endpoints match your search.</p>
              ) : (
                filteredPaths(activeTag).map(({ path, method, item }) => (
                  <EndpointCard
                    key={`${method}:${path}`}
                    path={path}
                    method={method}
                    item={item}
                    baseUrl={baseUrl}
                  />
                ))
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
