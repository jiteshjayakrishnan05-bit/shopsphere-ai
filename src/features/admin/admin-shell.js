"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, LayoutDashboard, MessageSquareText, PackageCheck, Tags } from "lucide-react";
import { RouteGuard } from "@/components/common/route-guard";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Boxes },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/orders", label: "Orders", icon: PackageCheck },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquareText },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

/** Administrator-only layout with its own navigation. The guard is a client-side UI guard for this frontend-only demo. */
export function AdminShell({ children }) {
  const pathname = usePathname();
  return (
    <RouteGuard roles={["admin"]}>
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[13rem_1fr] lg:gap-8">
        <nav aria-label="Administrator" className="mb-6 lg:mb-0">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {NAV.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href} className="shrink-0">
                  <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-surface-muted", active && "bg-brand-50 text-brand-700")}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0">
          <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="note">
            Demo administration: changes are saved locally in this browser, not in a production database. Revenue and conversion figures are simulated.
          </p>
          {children}
        </div>
      </div>
    </RouteGuard>
  );
}
