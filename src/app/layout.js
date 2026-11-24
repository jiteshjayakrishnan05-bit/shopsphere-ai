import "./globals.css";
import { AppProviders } from "@/providers/app-providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

export const metadata = {
  title: { default: `${APP_NAME} — ${APP_TAGLINE}`, template: `%s | ${APP_NAME}` },
  description: "Discover products that match how you shop. A demo storefront with explainable recommendations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <AppProviders>
          <SiteHeader />
          <main id="main">{children}</main>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
