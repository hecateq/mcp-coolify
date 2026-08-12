import { useState } from "react";
import { useApi } from "../hooks/useApi";
import { DataTable } from "../components/DataTable";
import { FilterBar } from "../components/FilterBar";
import { StatusBadge } from "../components/StatusBadge";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { SkeletonTable } from "../components/Skeleton";
import type { AuditEvent } from "../types";

export function AuditLog() {
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");
  const [resource, setResource] = useState("");

  const params = new URLSearchParams();
  if (action) params.set("action", action);
  if (result) params.set("result", result);
  if (resource) params.set("resource", resource);
  params.set("limit", "100");

  const queryString = params.toString();
  const { data, loading, error, refetch } = useApi<AuditEvent[]>(
    `/api/audit${queryString ? `?${queryString}` : ""}`
  );

  if (loading) return <SkeletonTable rows={5} cols={4} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit Log</h1>

      <FilterBar
        searchPlaceholder="Search by resource..."
        searchValue={resource}
        onSearchChange={setResource}
        filters={[
          {
            key: "result",
            label: "All Results",
            value: result,
            onChange: setResult,
            options: [
              { label: "Allowed", value: "allowed" },
              { label: "Denied", value: "denied" },
              { label: "Error", value: "error" },
            ],
          },
          {
            key: "action",
            label: "All Actions",
            value: action,
            onChange: setAction,
            options: [
              { label: "Deploy", value: "deploy" },
              { label: "Read", value: "read" },
              { label: "Write", value: "write" },
              { label: "Delete", value: "delete" },
            ],
          },
        ]}
      />

      {!data || data.length === 0 ? (
        <EmptyState title="No audit events found" />
      ) : (
        <DataTable
          columns={[
            {
              key: "timestamp",
              header: "Timestamp",
              render: (e) => (
                <span className="font-mono text-xs">
                  {new Date(e.timestamp).toLocaleString()}
                </span>
              ),
            },
            { key: "event", header: "Event" },
            {
              key: "resourceType",
              header: "Resource",
              render: (e) => (
                <span className="font-mono text-xs">
                  {e.resourceType || "—"}
                  {e.resourceUuid && (
                    <span className="ml-1 text-gray-500">
                      {e.resourceUuid.slice(0, 8)}
                    </span>
                  )}
                </span>
              ),
            },
            {
              key: "result",
              header: "Result",
              render: (e) => <StatusBadge status={e.result} />,
            },
            {
              key: "reason",
              header: "Reason",
              render: (e) => (
                <span className="text-xs text-gray-400 truncate max-w-xs block">
                  {e.reason || "—"}
                </span>
              ),
            },
          ]}
          data={data}
          keyExtractor={(e) => `${e.timestamp}-${e.event}`}
        />
      )}
    </div>
  );
}
