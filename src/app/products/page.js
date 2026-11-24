import { Suspense } from "react";
import { CatalogueView } from "@/features/products/catalogue-view";

export const metadata = { title: "Shop all products" };

export default function ProductsPage() {
  return (
    <Suspense>
      <CatalogueView source={{ type: "all" }} title="All products" subtitle="Browse the full catalogue, then filter and sort to narrow it down." />
    </Suspense>
  );
}
