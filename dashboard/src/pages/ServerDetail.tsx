import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../hooks/useApi";
import { StatusBadge } from "../components/StatusBadge";
import { DataTable } from "../components/DataTable";
import { ErrorState } from "../components/ErrorState";
import { SkeletonTable } from "../components/Skeleton";
import type { Server, Resource } from "../types";

interface ServerDetailData extends Server {
  description?: string;
  ip?: string;
}

export function ServerDetail() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { data: server, loading, error, refetch } = useApi<ServerDetailData>(
    uuid ? `/api/servers/${uuid}` : null
  );
  const { data: resources } = useApi<Resource[]>(
    uuid ? `/api/servers/${uuid}/resources` : null
  );

  if (loading) return <SkeletonTable rows={3} cols={3} />;
  if (error || !server) return <ErrorState message={error || "Server not found"} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate("/servers")} className="mb-2 text-sm text-blue-400 hover:text-blue-300">
          ← Servers
        </button>
        <h1 className="text-2xl font-semibold">{server.name}</h1>
        <p className="mt-1 font-mono text-xs text-gray-500">{server.uuid}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs text-gray-500">Status</div>
          <div className="mt-1">{server.status ? <StatusBadge status={server.status} /> : <span className="text-gray-500">—</span>}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs text-gray-500">Description</div>
          <div className="mt-1 text-sm">{server.description || "—"}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-3">
          <div className="text-xs text-gray-500">IP</div>
          <div className="mt-1 font-mono text-sm">{server.ip || "—"}</div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Resources</h2>
        {resources && resources.length > 0 ? (
          <DataTable
            columns={[
              { key: "name", header: "Name" },
              { key: "type", header: "Type" },
              { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
            ]}
            data={resources}
            keyExtractor={(r) => r.uuid}
            onRowClick={(r) => navigate(`/resources/${r.uuid}`)}
          />
        ) : (
          <p className="text-sm text-gray-500">No resources on this server</p>
        )}
      </div>
    </div>
  );
}
