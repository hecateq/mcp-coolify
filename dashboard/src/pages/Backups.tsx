import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { DataTable } from "../components/DataTable";
import { FilterBar } from "../components/FilterBar";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { SkeletonTable } from "../components/Skeleton";
import type { Backup } from "../types";

export function Backups() {
  const [search, setSearch] = useState("");
  const { data, loading, error, refetch } = useApi<Backup[]>("/api/backups");

  if (loading) return <SkeletonTable rows={5} cols={4} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const filtered = (data || []).filter(
    (b) =>
      (b.database_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Backups</h1>

      <FilterBar
        searchPlaceholder="Search backups..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      {filtered.length === 0 ? (
        <EmptyState title="No backups found" />
      ) : (
        <DataTable
          columns={[
            { key: "database_name", header: "Database", render: (b) => b.database_name || b.database_uuid },
            { key: "schedule", header: "Schedule", render: (b) => <span className="font-mono text-xs">{b.schedule || "—"}</span> },
            { key: "last_backup", header: "Last Backup", render: (b) => b.last_backup || "—" },
            { key: "status", header: "Status", render: (b) => b.status ? <StatusBadge status={b.status} /> : <span className="text-gray-500">—</span> },
          ]}
          data={filtered}
          keyExtractor={(b) => b.uuid}
        />
      )}
    </div>
  );
}
