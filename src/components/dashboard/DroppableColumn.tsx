import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function DroppableColumn({ id, children, className }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        "transition-all duration-200 max-h-[calc(100vh-180px)] flex flex-col",
        isOver && "ring-2 ring-primary ring-offset-2",
        className
      )}
    >
      {children}
    </div>
  );
}
