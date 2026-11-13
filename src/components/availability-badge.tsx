import type { InventoryStatus } from "@/lib/use-inventory-availability";

const STATUS_CONTENT: Record<InventoryStatus, { label: string; className: string }> = {
  in_stock: {
    label: "In stock",
    className: "bg-emerald-100 text-emerald-900",
  },
  low_stock: {
    label: "Low stock",
    className: "bg-amber-100 text-amber-900",
  },
  unavailable: {
    label: "Unavailable",
    className: "bg-primary/10 text-primary",
  },
};

export function AvailabilityBadge({
  status,
  loading,
  error,
}: {
  status?: InventoryStatus;
  loading?: boolean;
  error?: string;
}) {
  const content = status ? STATUS_CONTENT[status] : null;
  return (
    <span
      role="status"
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        content?.className ?? "bg-surface-muted text-muted"
      }`}
      title={error || undefined}
    >
      {content?.label ?? (loading ? "Checking availability…" : "Availability unconfirmed")}
    </span>
  );
}
