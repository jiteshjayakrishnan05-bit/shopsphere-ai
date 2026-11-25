import { Check } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";
import { ORDER_STATUSES, statusIndex } from "./order-lifecycle";
import { cn } from "@/lib/utils";

/** Six-stage progress timeline. Completed stages show their timestamp; the current stage is marked for assistive tech. */
export function OrderTimeline({ order }) {
  const current = statusIndex(order.status);
  const when = Object.fromEntries(order.timeline.map((t) => [t.status, t.at]));
  return (
    <ol aria-label="Order progress" className="space-y-0">
      {ORDER_STATUSES.map((s, i) => {
        const done = i <= current;
        const isCurrent = i === current;
        return (
          <li key={s.id} aria-current={isCurrent ? "step" : undefined} className="relative flex gap-3 pb-6 last:pb-0">
            {i < ORDER_STATUSES.length - 1 && <span aria-hidden="true" className={cn("absolute left-[11px] top-6 h-full w-0.5", i < current ? "bg-brand-600" : "bg-line")} />}
            <span className={cn("relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full", done ? "bg-brand-600 text-white" : "border-2 border-line bg-surface")}>
              {done && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
            </span>
            <div>
              <p className={cn("text-sm", isCurrent ? "font-semibold" : done ? "" : "text-ink-soft")}>
                {s.label}
                {isCurrent && <span className="sr-only"> (current status)</span>}
              </p>
              <p className="text-xs text-ink-soft">{when[s.id] ? formatDateTime(when[s.id]) : "Pending"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
