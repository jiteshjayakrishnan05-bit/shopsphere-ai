"use client";

import { RouteGuard } from "@/components/common/route-guard";
import { MyReviewsView } from "@/features/reviews/my-reviews-view";

export default function MyReviewsPage() {
  return (
    <RouteGuard roles={["customer"]}>
      <MyReviewsView />
    </RouteGuard>
  );
}
