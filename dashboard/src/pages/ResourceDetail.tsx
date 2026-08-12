import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { StatusBadge } from "../components/StatusBadge";
import { DataTable } from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { SkeletonTable } from "../components/Skeleton";
import type { Resource, Deployment } from "../types";

interface ResourceDetailData extends Resource {
  description?: string;
  ports?: string;
  repository?: string;
  git_branch?: string;
  project_name?: string;
}

export function ResourceDetail() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { data: resource, loading, error, refetch } = useApi<ResourceDetailData>(
    `/api/resources/${uuid}`
  );
  const { data: deployments } = useApi<Deployment[]>(
    resource ? `/api/deployments?resource_uuid=${uuid}` : null
  );

  if (loading) return <SkeletonTable rows={3} cols={3} />;
  if (error || !resource) return <ErrorState message={error || "Resource not found"} onRetry={refetch} />;

  const info = [
    { label: "Type", value: resource.type },
    { label: "Status", value: resource.status, isStatus: true },
    { label: "Environment", value: resource.environment_name || "—" },
    { label: "FQDN", value: resource.fqdn || "—" },
    { label: "Project", value: resource.project_name || resource.project_uuid },
    { label: "Ports", value: resource.ports || "—" },
    { label: "Repository", value: resource.repository || "—" },
    { label: "Branch", value: resource.git_branch || "—" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate("/resources")} className="mb-2 text-sm text-blue-400 hover:text-blue-300">
          ← Resources
        </button>
        <h1 className="text-2xl font-semibold">{resource.name}</h1>
        <p className="mt-1 font-mono text-xs text-gray-500">{resource.uuid}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {info.map((item) => (
          <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="text-xs text-gray-500">{item.label}</div>
            <div className="mt-1 text-sm">
              {item.isStatus ? (
                <StatusBadge status={item.value} />
              ) : (
                <span className="font-mono">{item.value}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {resource.description && (
        <p className="text-sm text-gray-400">{resource.description}</p>
      )}

      <div>
        <h2 className="mb-3 text-lg font-medium">Recent Deployments</h2>
        {deployments && deployments.length > 0 ? (
          <DataTable
            columns={[
              { key: "status", header: "Status", render: (d) => <StatusBadge status={d.status} /> },
              { key: "deployment_uuid", header: "UUID", className: "font-mono text-xs" },
              { key: "created_at", header: "Created" },
            ]}
            data={deployments}
            keyExtractor={(d) => d.deployment_uuid}
            onRowClick={(d) => navigate(`/deployments/${d.deployment_uuid}`)}
          />
        ) : (
          <p className="text-sm text-gray-500">No deployments found</p>
        )}
      </div>
    </div>
  );
}
