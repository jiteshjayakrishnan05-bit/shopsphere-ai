import Link from "next/link";
import { Globe2 } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

/** Phase 1 header: brand only. Navigation, search, cart and account arrive in later phases. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            <Globe2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>{APP_NAME}</span>
        </Link>
      </div>
    </header>
  );
}
