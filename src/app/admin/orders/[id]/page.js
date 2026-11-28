import { AdminOrderPage } from "@/features/admin/admin-order-page";

export default async function Page({ params }) {
  const { id } = await params;
  return <AdminOrderPage id={decodeURIComponent(id)} />;
}
