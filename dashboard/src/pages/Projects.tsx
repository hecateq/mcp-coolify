import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { DataTable } from "../components/DataTable";
import { FilterBar } from "../components/FilterBar";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { SkeletonTable } from "../components/Skeleton";
import type { Project } from "../types";

export function Projects() {
  const [search, setSearch] = useState("");
  const { data, loading, error, refetch } = useApi<Project[]>("/api/projects");
  const navigate = useNavigate();

  if (loading) return <SkeletonTable rows={5} cols={3} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const filtered = (data || []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Projects</h1>

      <FilterBar
        searchPlaceholder="Search projects..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      {filtered.length === 0 ? (
        <EmptyState title="No projects found" description="No projects match your search." />
      ) : (
        <DataTable
          columns={[
            { key: "name", header: "Name" },
            { key: "description", header: "Description" },
            { key: "uuid", header: "UUID", className: "font-mono text-xs text-gray-500" },
          ]}
          data={filtered}
          keyExtractor={(p) => p.uuid}
          onRowClick={(p) => navigate(`/projects/${p.uuid}`)}
        />
      )}
    </div>
  );
}
