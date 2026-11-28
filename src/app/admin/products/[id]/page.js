import { AdminProductEditor } from "@/features/admin/product-editor";

export default async function EditProductPage({ params }) {
  const { id } = await params;
  return <AdminProductEditor id={id} />;
}
