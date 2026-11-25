import { OrderDetailPage } from "@/features/orders/order-detail-page";

export const metadata = { title: "Order details" };

export default async function Page({ params }) {
  const { id } = await params;
  return <OrderDetailPage id={decodeURIComponent(id)} />;
}
