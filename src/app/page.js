import { FeaturedProducts } from "@/features/products/featured-products";
import { APP_TAGLINE } from "@/lib/constants";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <section aria-labelledby="hero-heading" className="max-w-2xl">
        <h1 id="hero-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {APP_TAGLINE}
        </h1>
        <p className="mt-3 text-ink-soft">
          Foundation build: the live product feed below runs through the API client, TanStack Query and the product
          normaliser.
        </p>
      </section>
      <section aria-labelledby="featured-heading" className="mt-10">
        <h2 id="featured-heading" className="mb-4 text-xl font-semibold">
          Top-rated products
        </h2>
        <FeaturedProducts />
      </section>
    </div>
  );
}
