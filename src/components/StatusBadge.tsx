const STATUS_COLORS: Record<string, string> = {
  PERMITTED: "bg-blue-100 text-blue-800",
  DRILLING: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-purple-100 text-purple-800",
  PRODUCING: "bg-green-100 text-green-800",
  SHUT_IN: "bg-orange-100 text-orange-800",
  ABANDONED: "bg-gray-100 text-gray-600",
  PLUGGED: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600";
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}
