import React from 'react';
import { cn } from '@/lib/utils';

interface ScrollableColumnProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollableColumn({ children, className }: ScrollableColumnProps) {
  return (
    <div className={cn("relative flex-1 min-h-0", className)}>
      {/* Top fade - always visible but subtle */}
      <div 
        className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-b from-card/50 to-transparent pointer-events-none z-10"
        aria-hidden="true"
      />
      
      {/* Scrollable content */}
      <div className="h-full overflow-y-auto p-2 space-y-2">
        {children}
      </div>

      {/* Bottom fade - always visible but subtle */}
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
