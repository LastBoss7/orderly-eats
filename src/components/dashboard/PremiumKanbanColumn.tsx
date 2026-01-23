import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  AlertTriangle, 
  Flame,
  CheckCircle2,
  Truck,
  UtensilsCrossed,
} from 'lucide-react';
import { DroppableColumn } from './DroppableColumn';

interface PremiumKanbanColumnProps {
  id: string;
  title: string;
  count: number;
  variant: 'pending' | 'preparing' | 'ready' | 'served' | 'delivery';
  hasDelayed?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  emptyMessage?: string;
  headerContent?: React.ReactNode;
}

// Revolut/Apple-inspired: Muted, professional colors with subtle accents
const variantConfig = {
  pending: {
    icon: Clock,
    headerBg: 'bg-zinc-100 dark:bg-zinc-800/80',
    headerBorder: 'border-b border-zinc-200 dark:border-zinc-700',
    bg: 'bg-zinc-50/50 dark:bg-zinc-900/30',
    border: 'border-zinc-200/60 dark:border-zinc-800/60',
    iconBg: 'bg-zinc-200/80 dark:bg-zinc-700/60',
    iconColor: 'text-zinc-600 dark:text-zinc-400',
    textColor: 'text-zinc-700 dark:text-zinc-300',
    emptyBg: 'bg-zinc-100/50 dark:bg-zinc-800/30',
    badgeBg: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300',
    accentDot: 'bg-amber-500',
  },
  preparing: {
    icon: Flame,
    headerBg: 'bg-zinc-100 dark:bg-zinc-800/80',
    headerBorder: 'border-b border-zinc-200 dark:border-zinc-700',
    bg: 'bg-zinc-50/50 dark:bg-zinc-900/30',
    border: 'border-zinc-200/60 dark:border-zinc-800/60',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    textColor: 'text-zinc-700 dark:text-zinc-300',
    emptyBg: 'bg-zinc-100/50 dark:bg-zinc-800/30',
    badgeBg: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300',
    accentDot: 'bg-orange-500',
  },
  ready: {
    icon: CheckCircle2,
    headerBg: 'bg-zinc-100 dark:bg-zinc-800/80',
    headerBorder: 'border-b border-zinc-200 dark:border-zinc-700',
    bg: 'bg-zinc-50/50 dark:bg-zinc-900/30',
    border: 'border-zinc-200/60 dark:border-zinc-800/60',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    textColor: 'text-zinc-700 dark:text-zinc-300',
    emptyBg: 'bg-zinc-100/50 dark:bg-zinc-800/30',
    badgeBg: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300',
    accentDot: 'bg-emerald-500',
  },
  served: {
    icon: UtensilsCrossed,
    headerBg: 'bg-zinc-100 dark:bg-zinc-800/80',
    headerBorder: 'border-b border-zinc-200 dark:border-zinc-700',
    bg: 'bg-zinc-50/50 dark:bg-zinc-900/30',
    border: 'border-zinc-200/60 dark:border-zinc-800/60',
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    iconColor: 'text-violet-600 dark:text-violet-400',
    textColor: 'text-zinc-700 dark:text-zinc-300',
    emptyBg: 'bg-zinc-100/50 dark:bg-zinc-800/30',
    badgeBg: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300',
    accentDot: 'bg-violet-500',
  },
  delivery: {
    icon: Truck,
    headerBg: 'bg-zinc-100 dark:bg-zinc-800/80',
    headerBorder: 'border-b border-zinc-200 dark:border-zinc-700',
    bg: 'bg-zinc-50/50 dark:bg-zinc-900/30',
    border: 'border-zinc-200/60 dark:border-zinc-800/60',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    textColor: 'text-zinc-700 dark:text-zinc-300',
    emptyBg: 'bg-zinc-100/50 dark:bg-zinc-800/30',
    badgeBg: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300',
    accentDot: 'bg-blue-500',
  },
};

export function PremiumKanbanColumn({
  id,
  title,
  count,
  variant,
  hasDelayed = false,
  headerAction,
  children,
  emptyMessage = 'Nenhum pedido',
  headerContent,
}: PremiumKanbanColumnProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;
  const isEmpty = count === 0;

  return (
    <DroppableColumn 
      id={id} 
      className={`w-80 xl:w-[340px] flex-shrink-0 flex flex-col rounded-xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${config.bg} ${config.border}`}
    >
      {/* Clean, minimal header */}
      <div className={`${config.headerBg} ${config.headerBorder}`}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center relative`}>
              <Icon className={`w-4 h-4 ${config.iconColor}`} />
              {/* Subtle accent dot */}
              <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${config.accentDot}`} />
            </div>
            <div>
              <h3 className={`font-semibold text-sm ${config.textColor}`}>{title}</h3>
              {hasDelayed && (
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[10px] mt-0.5">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Atrasados</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <Badge className={`h-6 min-w-[28px] px-2 text-xs font-semibold border-0 ${config.badgeBg}`}>
              {count}
            </Badge>
          </div>
        </div>
      </div>

      {/* Header Settings Content */}
      {headerContent && (
        <div className="border-b border-zinc-200 dark:border-zinc-700 bg-card/50">
          {headerContent}
        </div>
      )}

      {/* Orders Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          <AnimatePresence mode="popLayout">
            {isEmpty ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex flex-col items-center justify-center py-12 rounded-lg ${config.emptyBg}`}
              >
                <div className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-6 h-6 ${config.iconColor} opacity-50`} />
                </div>
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
              </motion.div>
            ) : (
              children
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </DroppableColumn>
  );
}
