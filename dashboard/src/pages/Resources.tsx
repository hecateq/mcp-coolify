import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { DataTable } from "../components/DataTable";
import { FilterBar } from "../components/FilterBar";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { SkeletonTable } from "../components/Skeleton";
import type { Resource } from "../types";

export function Resources() {
  const [searchParams] = useSearchParams();
  const typeFromUrl = searchParams.get("type") || "";

  const [search, setSearch] = useState("");
  const [type, setType] = useState(typeFromUrl);
  const [status, setStatus] = useState("");

  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (status) params.set("status", status);

  const queryString = params.toString();
  const { data, loading, error, refetch } = useApi<Resource[]>(
    `/api/resources${queryString ? `?${queryString}` : ""}`
  );
  const navigate = useNavigate();

  if (loading) return <SkeletonTable rows={5} cols={5} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const filtered = (data || []).filter(
    (r) => r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Resources</h1>

      <FilterBar
        searchPlaceholder="Search resources..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            key: "type",
            label: "All Types",
            value: type,
            onChange: setType,
            options: [
              { label: "Application", value: "application" },
              { label: "Service", value: "service" },
              { label: "PostgreSQL", value: "postgresql" },
              { label: "MySQL", value: "mysql" },
              { label: "MongoDB", value: "mongodb" },
              { label: "Redis", value: "redis" },
              { label: "MariaDB", value: "mariadb" },
            ],
          },
          {
            key: "status",
            label: "All Statuses",
            value: status,
            onChange: setStatus,
            options: [
              { label: "Running", value: "running" },
              { label: "Stopped", value: "stopped" },
              { label: "Degraded", value: "degraded" },
              { label: "Restarting", value: "restarting" },
              { label: "Exited", value: "exited" },
            ],
          },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState title="No resources found" description="No resources match your filters." />
      ) : (
        <DataTable
          columns={[
            { key: "name", header: "Name" },
            { key: "type", header: "Type" },
            { key: "environment_name", header: "Environment" },
            { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            { key: "fqdn", header: "FQDN" },
          ]}
          data={filtered}
          keyExtractor={(r) => r.uuid}
          onRowClick={(r) => navigate(`/resources/${r.uuid}`)}
        />
      )}
    </div>
  );
}
