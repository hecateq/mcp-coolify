import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { DataTable } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState } from "../components/ErrorState";
import { SkeletonTable } from "../components/Skeleton";
import type { Project, Resource, Deployment } from "../types";

type Tab = "overview" | "resources" | "deployments";

export function ProjectDetail() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: project, loading, error, refetch } = useApi<Project>(`/api/projects/${uuid}`);
  const { data: resources } = useApi<Resource[]>(tab === "resources" ? `/api/projects/${uuid}/resources` : null);
  const { data: deployments } = useApi<Deployment[]>(tab === "deployments" ? `/api/projects/${uuid}/deployments` : null);

  if (loading) return <SkeletonTable rows={3} cols={4} />;
  if (error || !project) return <ErrorState message={error || "Project not found"} onRetry={refetch} />;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "resources", label: "Resources" },
    { key: "deployments", label: "Deployments" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate("/projects")} className="mb-2 text-sm text-blue-400 hover:text-blue-300">
          ← Projects
        </button>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        {project.description && <p className="mt-1 text-sm text-gray-400">{project.description}</p>}
        <p className="mt-1 font-mono text-xs text-gray-500">{project.uuid}</p>
      </div>

      <div className="flex gap-1 border-b border-gray-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          {project.environments && project.environments.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-400">Environments</h3>
              <div className="flex gap-2">
                {project.environments.map((env) => (
                  <span key={env.id} className="rounded-md bg-gray-800 px-3 py-1 text-sm">
                    {env.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "resources" && (
        <div>
          {resources && resources.length > 0 ? (
            <DataTable
              columns={[
                { key: "name", header: "Name" },
                { key: "type", header: "Type" },
                { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
                { key: "fqdn", header: "FQDN" },
              ]}
              data={resources}
              keyExtractor={(r) => r.uuid}
              onRowClick={(r) => navigate(`/resources/${r.uuid}`)}
            />
          ) : (
            <p className="text-sm text-gray-500">No resources found</p>
          )}
        </div>
      )}

      {tab === "deployments" && (
        <div>
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
      )}
    </div>
  );
}
