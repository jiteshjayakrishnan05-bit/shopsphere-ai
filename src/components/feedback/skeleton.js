import { cn } from "@/lib/utils";

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-surface-muted", className)} />;
}

/** Skeleton shaped like a ProductCard so layout doesn't jump on load (CLS). */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-3 shadow-card">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/3" />
      <Skeleton className="mt-3 h-9 w-full" />
    </div>
  );
}
