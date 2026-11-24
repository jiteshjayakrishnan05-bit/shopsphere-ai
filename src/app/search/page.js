import { Suspense } from "react";
import { SearchResults } from "@/features/search/search-results";

export const metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
