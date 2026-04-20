"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type VirtualWindowListProps<T> = {
  className?: string;
  estimateHeight: number;
  items: T[];
  overscan?: number;
  renderItem: (item: T, index: number) => ReactNode;
};

export function VirtualWindowList<T>({
  className,
  estimateHeight,
  items,
  overscan = 4,
  renderItem,
}: VirtualWindowListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewportHeight, setViewportHeight] = useState(640);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const syncSize = () => setViewportHeight(node.clientHeight || 640);
    syncSize();

    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncSize) : null;
    observer?.observe(node);
    return () => observer?.disconnect();
  }, []);

  const { start, end, topSpacer, bottomSpacer } = useMemo(() => {
    const visibleCount = Math.max(1, Math.ceil(viewportHeight / estimateHeight));
    const startIndex = Math.max(0, Math.floor(scrollTop / estimateHeight) - overscan);
    const endIndex = Math.min(items.length, startIndex + visibleCount + (overscan * 2));
    return {
      start: startIndex,
      end: endIndex,
      topSpacer: startIndex * estimateHeight,
      bottomSpacer: Math.max(0, (items.length - endIndex) * estimateHeight),
    };
  }, [estimateHeight, items.length, overscan, scrollTop, viewportHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      className={className}
    >
      <div style={{ paddingTop: topSpacer, paddingBottom: bottomSpacer }}>
        {items.slice(start, end).map((item, index) => renderItem(item, start + index))}
      </div>
    </div>
  );
}
