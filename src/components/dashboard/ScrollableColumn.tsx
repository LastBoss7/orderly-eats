import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ScrollableColumnProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollableColumn({ children, className }: ScrollableColumnProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTopIndicator, setShowTopIndicator] = useState(false);
  const [showBottomIndicator, setShowBottomIndicator] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const threshold = 10;

    setShowTopIndicator(scrollTop > threshold);
    setShowBottomIndicator(scrollTop + clientHeight < scrollHeight - threshold);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Check initially
    checkScroll();

    // Check on scroll with passive listener for better performance
    el.addEventListener('scroll', checkScroll, { passive: true });
    
    // Check on resize only
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll]);

  // Re-check when children change (using a simple interval approach instead of MutationObserver)
  useEffect(() => {
    // Small delay to let DOM settle after children updates
    const timeoutId = setTimeout(checkScroll, 100);
    return () => clearTimeout(timeoutId);
  }, [children, checkScroll]);

  return (
    <div className={cn("relative flex-1 min-h-0", className)}>
      {/* Top scroll indicator */}
      {showTopIndicator && (
        <div 
          className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background/80 to-transparent pointer-events-none z-10"
        />
      )}
      
      {/* Scrollable content */}
      <div 
        ref={scrollRef}
        className="h-full overflow-y-auto p-2 space-y-2"
      >
        {children}
      </div>

      {/* Bottom scroll indicator */}
      {showBottomIndicator && (
        <div 
          className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted/60 to-transparent pointer-events-none z-10 flex items-end justify-center pb-1"
        >
          <svg 
            className="w-4 h-4 text-muted-foreground/60 animate-bounce" 
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
      )}
    </div>
  );
}
