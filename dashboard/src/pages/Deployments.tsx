import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { DataTable } from "../components/DataTable";
import { FilterBar } from "../components/FilterBar";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { SkeletonTable } from "../components/Skeleton";
import { postApi } from "../api/client";
import type { Deployment } from "../types";

export function Deployments() {
  const [searchParams] = useSearchParams();
  const statusFromUrl = searchParams.get("status") || "";

  const [status, setStatus] = useState(statusFromUrl);

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const queryString = params.toString();

  const { data, loading, error, refetch } = useApi<Deployment[]>(
    `/api/deployments${queryString ? `?${queryString}` : ""}`
  );
  const navigate = useNavigate();

  async function handleCancel(e: React.MouseEvent, uuid: string) {
    e.stopPropagation();
    try {
      await postApi(`/api/deployments/${uuid}/cancel`);
      refetch();
    } catch {
      refetch();
    }
  }

  if (loading) return <SkeletonTable rows={5} cols={5} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Deployments</h1>

      <FilterBar
        filters={[
          {
            key: "status",
            label: "All Statuses",
            value: status,
            onChange: setStatus,
            options: [
              { label: "Running", value: "in_progress" },
              { label: "Queued", value: "queued" },
              { label: "Finished", value: "finished" },
              { label: "Failed", value: "failed" },
              { label: "Cancelled", value: "cancelled-by-user" },
            ],
          },
        ]}
      />

      {!data || data.length === 0 ? (
        <EmptyState title="No deployments found" />
      ) : (
        <DataTable
          columns={[
            { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
            { key: "resource_name", header: "Resource", render: (d) => d.resource_name || d.resource_uuid },
            { key: "created_at", header: "Started", render: (d) => d.created_at || "—" },
            { key: "finished_at", header: "Finished", render: (d) => d.finished_at || "—" },
            {
              key: "actions",
              header: "Actions",
              render: (d) =>
                (d.status === "in_progress" || d.status === "queued") ? (
                  <button
                    onClick={(e) => handleCancel(e, d.deployment_uuid)}
                    className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20"
                  >
                    Cancel
                  </button>
                ) : d.status === "failed" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/deployments/${d.deployment_uuid}`);
                    }}
                    className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-400 hover:bg-amber-500/20"
                  >
                    Details
                  </button>
                ) : null,
            },
          ]}
          data={data}
          keyExtractor={(d) => d.deployment_uuid}
          onRowClick={(d) => navigate(`/deployments/${d.deployment_uuid}`)}
        />
      )}
    </div>
  );
}
