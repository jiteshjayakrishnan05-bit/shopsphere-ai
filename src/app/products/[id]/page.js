import { ProductDetail } from "@/features/products/product-detail";

export const metadata = { title: "Product details" };

export default async function ProductPage({ params }) {
  const { id } = await params;
  return <ProductDetail id={id} />;
}
