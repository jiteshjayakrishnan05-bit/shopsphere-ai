import { statusIndex, statusLabel } from "./order-lifecycle";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }) {
  const delivered = status === "delivered";
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", delivered ? "bg-success/10 text-success" : statusIndex(status) <= 1 ? "bg-surface-muted text-ink-soft" : "bg-brand-50 text-brand-700")}>
      {statusLabel(status)}
    </span>
  );
}
