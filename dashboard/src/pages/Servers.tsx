import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { DataTable } from "../components/DataTable";
import { FilterBar } from "../components/FilterBar";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { SkeletonTable } from "../components/Skeleton";
import type { Server } from "../types";

export function Servers() {
  const [search, setSearch] = useState("");
  const { data, loading, error, refetch } = useApi<Server[]>("/api/servers");
  const navigate = useNavigate();

  if (loading) return <SkeletonTable rows={5} cols={3} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const filtered = (data || []).filter(
    (s) => s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Servers</h1>

      <FilterBar
        searchPlaceholder="Search servers..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      {filtered.length === 0 ? (
        <EmptyState title="No servers found" />
      ) : (
        <DataTable
          columns={[
            { key: "name", header: "Name" },
            { key: "uuid", header: "UUID", className: "font-mono text-xs text-gray-500" },
            { key: "status", header: "Status", render: (s) => s.status ? <StatusBadge status={s.status} /> : <span className="text-gray-500">—</span> },
          ]}
          data={filtered}
          keyExtractor={(s) => s.uuid}
          onRowClick={(s) => navigate(`/servers/${s.uuid}`)}
        />
      )}
    </div>
  );
}
