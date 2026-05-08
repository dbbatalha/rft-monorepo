import { useEffect, useRef, useState } from "react";

/**
 * Infinite scroll via IntersectionObserver.
 * @param total     Total number of items in the list.
 * @param pageSize  How many items to reveal per batch.
 * @param resetKey  Any value — when it changes, visible count resets to pageSize.
 */
export function useInfiniteScroll(total: number, pageSize: number, resetKey: unknown) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset when filters / search / data source changes
  useEffect(() => {
    setVisibleCount(pageSize);
  }, [resetKey, pageSize]);

  // Reveal more when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= total) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => Math.min(c + pageSize, total));
        }
      },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleCount, total, pageSize]);

  /** Expande visibleCount até cobrir o índice solicitado (útil para alphabet jump). */
  const ensureVisible = (atLeast: number) => {
    setVisibleCount((c) => Math.min(Math.max(c, atLeast + 1), total));
  };

  return {
    visibleCount,
    sentinelRef,
    hasMore: visibleCount < total,
    ensureVisible,
  };
}
