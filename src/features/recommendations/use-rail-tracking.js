"use client";

import { useEffect, useRef } from "react";
import { useRecAnalyticsStore } from "@/store";

/**
 * Count an impression once per displayed rail: only when it scrolls into view, never per re-render.
 * Returns a ref to attach to the rail element. `ready` must be true only when the rail has items to show.
 */
export function useImpressionOnce(strategy, ready) {
  const ref = useRef(null);
  const fired = useRef(false);
  const record = useRecAnalyticsStore((s) => s.recordImpression);

  useEffect(() => {
    if (!ready || fired.current || !ref.current) return;
    const fire = () => {
      if (fired.current) return;
      fired.current = true;
      record(strategy);
    };
    if (typeof IntersectionObserver === "undefined") {
      fire();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        fire();
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ready, strategy, record]);

  return ref;
}
