import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { DataTable } from "../components/DataTable";
import { FilterBar } from "../components/FilterBar";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { SkeletonTable } from "../components/Skeleton";
import type { ScheduledTask } from "../types";

export function ScheduledTasks() {
  const [search, setSearch] = useState("");
  const { data, loading, error, refetch } = useApi<ScheduledTask[]>("/api/scheduled-tasks");

  if (loading) return <SkeletonTable rows={5} cols={4} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const filtered = (data || []).filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.resource_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Scheduled Tasks</h1>

      <FilterBar
        searchPlaceholder="Search tasks..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      {filtered.length === 0 ? (
        <EmptyState title="No scheduled tasks found" />
      ) : (
        <DataTable
          columns={[
            { key: "name", header: "Name" },
            { key: "resource_name", header: "Resource", render: (t) => t.resource_name || t.resource_uuid },
            { key: "schedule", header: "Schedule", render: (t) => <span className="font-mono text-xs">{t.schedule}</span> },
            { key: "status", header: "Last Status", render: (t) => t.status ? <StatusBadge status={t.status} /> : <span className="text-gray-500">—</span> },
            { key: "enabled", header: "Enabled", render: (t) => (
              <span className={t.enabled ? "text-green-400" : "text-gray-500"}>
                {t.enabled ? "Yes" : "No"}
              </span>
            )},
          ]}
          data={filtered}
          keyExtractor={(t) => t.task_uuid}
        />
      )}
    </div>
  );
}
