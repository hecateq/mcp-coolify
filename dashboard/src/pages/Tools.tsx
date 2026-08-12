import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { FilterBar } from "../components/FilterBar";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { SkeletonTable } from "../components/Skeleton";
import type { McpTool } from "../types";

const operationClassColors: Record<string, string> = {
  read: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  deploy: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  write: "bg-red-400/10 text-red-400 border-red-400/20",
};

function getOperationClass(tool: McpTool): string {
  if (tool.name.includes("deploy") || tool.name.includes("restart") || tool.name.includes("start") || tool.name.includes("stop") || tool.name.includes("cancel")) {
    return "deploy";
  }
  if (tool.readOnly) return "read";
  return "write";
}

export function Tools() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const { data, loading, error, refetch } = useApi<McpTool[]>("/api/tools");

  if (loading) return <SkeletonTable rows={5} cols={3} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const tools = (data || []).filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    if (filter === "all") return matchesSearch;
    if (filter === "read") return matchesSearch && t.readOnly;
    if (filter === "deploy") return matchesSearch && (t.name.includes("deploy") || t.name.includes("restart") || t.name.includes("start") || t.name.includes("stop") || t.name.includes("cancel"));
    if (filter === "write") return matchesSearch && !t.readOnly && !t.name.includes("deploy") && !t.name.includes("restart") && !t.name.includes("start") && !t.name.includes("stop") && !t.name.includes("cancel");
    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">MCP Tools</h1>

      <div className="flex flex-wrap items-center gap-3">
        <FilterBar
          searchPlaceholder="Search tools..."
          searchValue={search}
          onSearchChange={setSearch}
        />
        <div className="flex gap-1 rounded-lg border border-gray-800 p-0.5">
          {[
            { key: "all", label: "All" },
            { key: "read", label: "Read" },
            { key: "deploy", label: "Deploy" },
            { key: "write", label: "Write" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === tab.key
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {tools.length === 0 ? (
        <EmptyState title="No tools found" />
      ) : (
        <div className="space-y-2">
          {tools.map((tool) => {
            const opClass = getOperationClass(tool);
            return (
              <div
                key={tool.name}
                className="flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{tool.name}</span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${operationClassColors[opClass]}`}>
                      {opClass}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-400 line-clamp-2">{tool.description}</p>
                </div>
                <div className="flex shrink-0 gap-2 text-xs">
                  {tool.readOnly && (
                    <span className="rounded bg-green-400/10 px-1.5 py-0.5 text-green-400">Read-Only</span>
                  )}
                  {tool.destructive && (
                    <span className="rounded bg-red-400/10 px-1.5 py-0.5 text-red-400">Destructive</span>
                  )}
                  {tool.idempotent && (
                    <span className="rounded bg-gray-400/10 px-1.5 py-0.5 text-gray-400">Idempotent</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
