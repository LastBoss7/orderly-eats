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

    // Check on scroll
    el.addEventListener('scroll', checkScroll);
    
    // Check on resize
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    // Check when children change
    const mutationObserver = new MutationObserver(checkScroll);
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [checkScroll]);

  return (
    <div className={cn("relative flex-1 min-h-0", className)}>
      {/* Top scroll indicator */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background/80 to-transparent pointer-events-none z-10 transition-opacity duration-200",
          showTopIndicator ? "opacity-100" : "opacity-0"
        )}
      />
      
      {/* Scrollable content */}
      <div 
        ref={scrollRef}
        className="h-full overflow-y-auto p-3 space-y-3"
      >
        {children}
      </div>

      {/* Bottom scroll indicator */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted/60 to-transparent pointer-events-none z-10 transition-opacity duration-200 flex items-end justify-center pb-1",
          showBottomIndicator ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex flex-col items-center animate-bounce">
          <svg 
            className="w-4 h-4 text-muted-foreground/60" 
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
    </div>
  );
}
