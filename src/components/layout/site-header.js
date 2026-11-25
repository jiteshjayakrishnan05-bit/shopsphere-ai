"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Globe2, Heart, LayoutDashboard, LogIn, LogOut, Package, ShoppingCart, User, UserPlus } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { formatCategory } from "@/lib/formatters";
import { useAuth } from "@/hooks/use-auth";
import { useCategories } from "@/hooks/use-products";
import { selectCartCount, useCartStore, useWishlistStore } from "@/store";
import { Dropdown } from "@/components/navigation/dropdown";
import { MobileMenu } from "@/components/navigation/mobile-menu";
import { SearchBox } from "@/components/navigation/search-box";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop" },
];

function CountBadge({ count }) {
  if (!count) return null;
  return (
    <span aria-hidden="true" className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-xs font-medium text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function IconLink({ href, label, count, children }) {
  return (
    <Link href={href} aria-label={count ? `${label}, ${count} items` : label} className="relative grid h-10 w-10 place-items-center rounded-md hover:bg-surface-muted">
      {children}
      <CountBadge count={count} />
    </Link>
  );
}

const menuItem = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, isAuthenticated, user, isAdmin, logout } = useAuth();
  const { data: categories } = useCategories();
  // Counts come from localStorage-backed stores, so render them only after hydration (avoids SSR mismatch).
  const cartCount = useCartStore(selectCartCount);
  const wishlistCount = useWishlistStore((s) => s.ids.length);

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:flex-nowrap">
        <MobileMenu links={NAV_LINKS} />
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            <Globe2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>{APP_NAME}</span>
        </Link>

        <nav aria-label="Primary" className="ml-2 hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={isActive(l.href) ? "page" : undefined} className={cn("rounded-md px-3 py-2 text-sm font-medium hover:bg-surface-muted", isActive(l.href) && "text-brand-600")}>
              {l.label}
            </Link>
          ))}
          <Dropdown label="Categories" panelClassName="max-h-96 w-64 overflow-y-auto">
            {(categories ?? []).length === 0 && <p className="px-3 py-2 text-sm text-ink-soft">Categories unavailable right now.</p>}
            {(categories ?? []).map((c) => (
              <Link key={c.slug} href={`/categories/${c.slug}`} className={menuItem}>
                {formatCategory(c.slug)}
              </Link>
            ))}
          </Dropdown>
        </nav>

        <div className="order-last w-full md:order-none md:ml-auto md:w-auto md:flex-1 md:max-w-md lg:ml-4">
          <Suspense fallback={<div className="h-9 rounded-full border border-line bg-surface" />}>
            <SearchBox />
          </Suspense>
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <IconLink href="/wishlist" label="Wishlist" count={hydrated ? wishlistCount : 0}>
            <Heart className="h-5 w-5" aria-hidden="true" />
          </IconLink>
          <IconLink href="/cart" label="Cart" count={hydrated ? cartCount : 0}>
            <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          </IconLink>
          {isAdmin && (
            <Link href="/admin" className="hidden items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-brand-600 hover:bg-surface-muted sm:flex">
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              Admin
            </Link>
          )}
          <Dropdown label={isAuthenticated ? user.name.split(" ")[0] : "Account"} icon={User} align="right" buttonClassName="max-w-40">
            {isAuthenticated ? (
              <>
                <Link href="/account" className={menuItem}>
                  <User className="h-4 w-4" aria-hidden="true" /> My account
                </Link>
                <Link href="/orders" className={menuItem}>
                  <Package className="h-4 w-4" aria-hidden="true" /> {isAdmin ? "All orders" : "My orders"}
                </Link>
                {isAdmin && (
                  <Link href="/admin" className={menuItem}>
                    <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Admin dashboard
                  </Link>
                )}
                <button
                  type="button"
                  data-close
                  className={menuItem}
                  onClick={() => {
                    logout();
                    router.push("/");
                  }}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={menuItem}>
                  <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in
                </Link>
                <Link href="/register" className={menuItem}>
                  <UserPlus className="h-4 w-4" aria-hidden="true" /> Create account
                </Link>
              </>
            )}
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
