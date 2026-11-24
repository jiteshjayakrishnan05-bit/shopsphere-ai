import { APP_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-ink-soft sm:px-6">
        <p className="font-medium text-ink">{APP_NAME}</p>
        <p className="mt-1 max-w-2xl">
          A demo storefront. Product data comes from DummyJSON, prices are shown in INR at a fixed demo rate, and no real
          payments are processed.
        </p>
      </div>
    </footer>
  );
}
