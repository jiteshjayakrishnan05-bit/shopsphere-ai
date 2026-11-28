import { cn } from "@/lib/utils";

/** Small shared pieces for the administrator screens. */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function SimulatedBadge({ children = "Simulated" }) {
  return <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">{children}</span>;
}

export function StatCard({ label, value, hint, simulated }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-sm text-ink-soft">
        {label}
        {simulated && <SimulatedBadge />}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}

export function Panel({ title, children, className }) {
  return (
    <section className={cn("rounded-[var(--radius-card)] border border-line bg-surface p-4", className)} aria-label={title}>
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export const inputCls = "rounded-md border border-line bg-surface px-3 py-1.5 text-sm";
export const btnPrimary = "rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60";
export const btnGhost = "rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-surface-muted";
