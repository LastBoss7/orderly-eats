import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualizedColumnProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize?: number;
  className?: string;
  gap?: number;
  getItemKey?: (item: T, index: number) => string | number;
  emptyState?: React.ReactNode;
}

export function VirtualizedColumn<T>({
  items,
  renderItem,
  estimateSize = 80,
  className,
  gap = 8,
  getItemKey,
  emptyState,
}: VirtualizedColumnProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 3,
    getItemKey: getItemKey ? (index) => getItemKey(items[index], index) : undefined,
  });

  if (items.length === 0 && emptyState) {
    return (
      <div className={cn("flex-1 min-h-0", className)}>
        {emptyState}
      </div>
    );
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={cn("relative flex-1 min-h-0", className)}>
      {/* Top fade indicator */}
      <div 
        className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-card/50 to-transparent pointer-events-none z-10"
        aria-hidden="true"
      />

      {/* Virtualized scrollable content */}
      <div 
        ref={parentRef}
        className="h-full overflow-y-auto p-2"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const item = items[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                  paddingBottom: `${gap}px`,
                }}
              >
                {renderItem(item, virtualItem.index)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom fade indicator */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-card/60 to-transparent pointer-events-none z-10 flex items-end justify-center"
        aria-hidden="true"
      >
        <svg 
          className="w-3 h-3 text-muted-foreground/40 mb-0.5" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M19 9l-7 7-7-7" 
          />
        </svg>
      </div>
    </div>
  );
}
