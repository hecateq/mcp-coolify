import { useApi } from "../hooks/useApi";
import { KpiCard } from "../components/KpiCard";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonTable } from "../components/Skeleton";
import { ErrorState } from "../components/ErrorState";
import type { OverviewData } from "../types";

function timeAgo(when: string): string {
  const diff = Date.now() - new Date(when).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Overview() {
  const { data, loading, error, refetch } = useApi<OverviewData>("/api/overview");

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonTable rows={2} cols={4} />
        <SkeletonTable rows={3} cols={3} />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error || "Failed to load overview"} onRetry={refetch} />;
  }

  const { kpi, recentActivity } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Projects" value={kpi.projects} color="blue" />
        <KpiCard label="Applications" value={kpi.applications} color="blue" />
        <KpiCard label="Services" value={kpi.services} color="blue" />
        <KpiCard label="Databases" value={kpi.databases} color="blue" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Deployments" value={kpi.deployments} color="gray" />
        <KpiCard label="Running" value={kpi.running} color="green" />
        <KpiCard label="Stopped" value={kpi.stopped} color="red" />
        <KpiCard label="Degraded" value={kpi.degraded} color="amber" />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <StatusBadge status={item.status} />
                <span className="text-sm font-medium">{item.resourceName}</span>
                {item.error && (
                  <span className="truncate text-xs text-red-400 max-w-xs">{item.error}</span>
                )}
                <span className="ml-auto text-xs text-gray-500">{timeAgo(item.when)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
