import { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: number;
  color?: "green" | "red" | "amber" | "blue" | "gray";
  icon?: ReactNode;
}

const colorMap = {
  green: "text-green-500 dark:text-green-400",
  red: "text-red-500 dark:text-red-400",
  amber: "text-amber-500 dark:text-amber-400",
  blue: "text-blue-500 dark:text-blue-400",
  gray: "text-gray-500 dark:text-gray-400",
};

const bgMap = {
  green: "bg-green-500/10 dark:bg-green-400/10",
  red: "bg-red-500/10 dark:bg-red-400/10",
  amber: "bg-amber-500/10 dark:bg-amber-400/10",
  blue: "bg-blue-500/10 dark:bg-blue-400/10",
  gray: "bg-gray-500/10 dark:bg-gray-400/10",
};

export function KpiCard({ label, value, color = "blue", icon }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        {icon && (
          <span className={`rounded-md p-1.5 ${bgMap[color]}`}>
            <span className={colorMap[color]}>{icon}</span>
          </span>
        )}
      </div>
      <p className={`mt-2 text-2xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}
