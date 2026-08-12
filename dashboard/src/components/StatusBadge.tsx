const statusStyles: Record<string, string> = {
  running: "bg-green-400/10 text-green-400 border-green-400/20",
  finished: "bg-green-400/10 text-green-400 border-green-400/20",
  success: "bg-green-400/10 text-green-400 border-green-400/20",
  allowed: "bg-green-400/10 text-green-400 border-green-400/20",
  "in_progress": "bg-blue-400/10 text-blue-400 border-blue-400/20",
  queued: "bg-gray-400/10 text-gray-400 border-gray-400/20",
  stopped: "bg-red-400/10 text-red-400 border-red-400/20",
  failed: "bg-red-400/10 text-red-400 border-red-400/20",
  error: "bg-red-400/10 text-red-400 border-red-400/20",
  denied: "bg-red-400/10 text-red-400 border-red-400/20",
  degraded: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  "cancelled-by-user": "bg-amber-400/10 text-amber-400 border-amber-400/20",
  restarting: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  exited: "bg-gray-400/10 text-gray-400 border-gray-400/20",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const style = statusStyles[status] || "bg-gray-400/10 text-gray-400 border-gray-400/20";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold uppercase ${style} ${className}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
