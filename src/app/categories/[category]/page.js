import { Suspense } from "react";
import { CatalogueView } from "@/features/products/catalogue-view";
import { formatCategory } from "@/lib/formatters";

export async function generateMetadata({ params }) {
  const { category } = await params;
  return { title: formatCategory(decodeURIComponent(category)) };
}

export default async function CategoryPage({ params }) {
  const { category } = await params;
  const slug = decodeURIComponent(category);
  return (
    <Suspense>
      <CatalogueView source={{ type: "category", category: slug }} title={formatCategory(slug)} />
    </Suspense>
  );
}
