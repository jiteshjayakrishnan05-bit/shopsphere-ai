"use client";

import { OrderDetail } from "@/features/orders/order-detail";

export function AdminOrderPage({ id }) {
  return <OrderDetail id={id} backHref="/admin/orders" backLabel="← All orders (admin)" />;
}
