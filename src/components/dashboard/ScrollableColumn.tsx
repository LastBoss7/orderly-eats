import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ScrollableColumnProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollableColumn({ children, className }: ScrollableColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const threshold = 5;

    setCanScrollUp(scrollTop > threshold);
    setCanScrollDown(scrollHeight - scrollTop - clientHeight > threshold);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Initial check
    updateScrollIndicators();

    // Listen for scroll events
    const handleScroll = () => updateScrollIndicators();
    el.addEventListener('scroll', handleScroll, { passive: true });

    // Watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      updateScrollIndicators();
    });
    resizeObserver.observe(el);

    // Watch for content changes via MutationObserver but only on childList, not attributes
    const mutationObserver = new MutationObserver(() => {
      // Use requestAnimationFrame to batch updates
      requestAnimationFrame(updateScrollIndicators);
    });
    mutationObserver.observe(el, { 
      childList: true, 
      subtree: true,
      attributes: false,
      characterData: false 
    });

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [updateScrollIndicators]);

  return (
    <div className={cn("relative flex-1 min-h-0 overflow-hidden", className)}>
      {/* Top fade indicator */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-card to-transparent pointer-events-none z-10 transition-opacity duration-150",
          canScrollUp ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />
      
      {/* Scrollable content */}
      <div 
        ref={scrollRef}
        className="h-full overflow-y-auto p-2 space-y-2 scrollbar-thin"
      >
        {children}
      </div>

      {/* Bottom fade indicator with arrow */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none z-10 transition-opacity duration-150 flex items-end justify-center pb-0.5",
          canScrollDown ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      >
        <svg 
          className="w-3 h-3 text-muted-foreground/50" 
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
