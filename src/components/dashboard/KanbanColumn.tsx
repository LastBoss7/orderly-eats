import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChefHat, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import { DroppableColumn } from './DroppableColumn';

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  variant: 'analysis' | 'production' | 'ready' | 'served';
  hasDelayed?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  headerContent?: React.ReactNode;
}

const variantStyles = {
  analysis: {
    column: 'bg-gradient-to-b from-orange-50/80 to-orange-50/30 dark:from-orange-950/20 dark:to-transparent border-orange-200/50 dark:border-orange-800/30',
    header: 'bg-gradient-to-r from-orange-500 to-amber-500',
    badge: 'bg-white/25 text-white border-white/30',
    headerText: 'text-white',
  },
  production: {
    column: 'bg-gradient-to-b from-amber-50/80 to-amber-50/30 dark:from-amber-950/20 dark:to-transparent border-amber-200/50 dark:border-amber-800/30',
    header: 'bg-gradient-to-r from-amber-400 to-yellow-400',
    badge: 'bg-gray-900/20 text-gray-900 border-gray-900/20',
    headerText: 'text-gray-900',
  },
  ready: {
    column: 'bg-gradient-to-b from-emerald-50/80 to-emerald-50/30 dark:from-emerald-950/20 dark:to-transparent border-emerald-200/50 dark:border-emerald-800/30',
    header: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    badge: 'bg-white/25 text-white border-white/30',
    headerText: 'text-white',
  },
  served: {
    column: 'bg-gradient-to-b from-violet-50/80 to-violet-50/30 dark:from-violet-950/20 dark:to-transparent border-violet-200/50 dark:border-violet-800/30',
    header: 'bg-gradient-to-r from-violet-500 to-purple-500',
    badge: 'bg-white/25 text-white border-white/30',
    headerText: 'text-white',
  },
};

export function KanbanColumn({
  id,
  title,
  count,
  variant,
  hasDelayed = false,
  headerAction,
  children,
  emptyIcon,
  emptyMessage,
  headerContent,
}: KanbanColumnProps) {
  const styles = variantStyles[variant];
  const isEmpty = count === 0;

  return (
    <DroppableColumn 
      id={id} 
      className={`w-72 xl:w-80 flex-shrink-0 flex flex-col rounded-2xl border overflow-hidden ${styles.column}`}
    >
      {/* Header */}
      <div className={`py-3.5 px-4 ${styles.header}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${styles.headerText}`}>{title}</span>
            {hasDelayed && (
              <AlertTriangle className="w-4 h-4 text-white/90" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <Badge className={`h-6 min-w-[28px] text-xs font-bold border ${styles.badge}`}>
              {count}
            </Badge>
          </div>
        </div>
      </div>

      {/* Header content (like settings panel) */}
      {headerContent && (
        <div className="border-b">
          {headerContent}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {isEmpty && emptyMessage ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <div className="w-12 h-12 mb-3 opacity-30 flex items-center justify-center text-4xl">
              {emptyIcon || <ChefHat className="w-10 h-10" />}
            </div>
            <p className="text-sm font-medium">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </DroppableColumn>
  );
}
