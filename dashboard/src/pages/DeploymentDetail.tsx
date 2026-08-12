import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState } from "../components/ErrorState";
import { SkeletonTable } from "../components/Skeleton";
import { postApi } from "../api/client";
import type { Deployment } from "../types";

interface DeploymentDetailData extends Deployment {
  resource_name?: string;
}

export function DeploymentDetail() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { data: deployment, loading, error, refetch } = useApi<DeploymentDetailData>(
    uuid ? `/api/deployments/${uuid}` : null
  );

  if (loading) return <SkeletonTable rows={3} cols={2} />;
  if (error || !deployment) return <ErrorState message={error || "Deployment not found"} onRetry={refetch} />;

  async function handleCancel() {
    try {
      await postApi(`/api/deployments/${uuid}/cancel`);
      refetch();
    } catch {
      refetch();
    }
  }

  const fields = [
    { label: "Status", value: deployment.status, isStatus: true },
    { label: "Resource", value: deployment.resource_name || deployment.resource_uuid },
    { label: "Commit", value: deployment.commit || "—" },
    { label: "Created", value: deployment.created_at || "—" },
    { label: "Finished", value: deployment.finished_at || "—" },
    { label: "UUID", value: deployment.deployment_uuid, mono: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate("/deployments")} className="mb-2 text-sm text-blue-400 hover:text-blue-300">
          ← Deployments
        </button>
        <h1 className="text-2xl font-semibold">Deployment Details</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.label} className="rounded-lg border border-gray-800 bg-gray-900 p-3 dark:border-gray-800 dark:bg-gray-900 border-gray-200 bg-white">
            <div className="text-xs text-gray-500">{f.label}</div>
            <div className="mt-1 text-sm">
              {f.isStatus ? (
                <StatusBadge status={f.value} />
              ) : (
                <span className={f.mono ? "font-mono text-xs" : ""}>{f.value}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {deployment.error && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4">
          <h3 className="text-sm font-medium text-red-400">Error</h3>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-red-300 font-mono">{deployment.error}</pre>
        </div>
      )}

      {(deployment.status === "in_progress" || deployment.status === "queued") && (
        <button
          onClick={handleCancel}
          className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
        >
          Cancel Deployment
        </button>
      )}
    </div>
  );
}
