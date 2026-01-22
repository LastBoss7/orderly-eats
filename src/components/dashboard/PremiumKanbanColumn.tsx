import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const variantConfig = {
  pending: {
    icon: Clock,
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50/50 dark:bg-amber-950/10',
    border: 'border-amber-200/60 dark:border-amber-800/40',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    emptyBg: 'bg-amber-50 dark:bg-amber-950/20',
  },
  preparing: {
    icon: Flame,
    gradient: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50/50 dark:bg-orange-950/10',
    border: 'border-orange-200/60 dark:border-orange-800/40',
    iconBg: 'bg-orange-100 dark:bg-orange-900/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    emptyBg: 'bg-orange-50 dark:bg-orange-950/20',
  },
  ready: {
    icon: CheckCircle2,
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50/50 dark:bg-emerald-950/10',
    border: 'border-emerald-200/60 dark:border-emerald-800/40',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    emptyBg: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
  served: {
    icon: UtensilsCrossed,
    gradient: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-50/50 dark:bg-violet-950/10',
    border: 'border-violet-200/60 dark:border-violet-800/40',
    iconBg: 'bg-violet-100 dark:bg-violet-900/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
    emptyBg: 'bg-violet-50 dark:bg-violet-950/20',
  },
  delivery: {
    icon: Truck,
    gradient: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-50/50 dark:bg-blue-950/10',
    border: 'border-blue-200/60 dark:border-blue-800/40',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    emptyBg: 'bg-blue-50 dark:bg-blue-950/20',
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
      className={`w-80 xl:w-[340px] flex-shrink-0 flex flex-col rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${config.bg} ${config.border}`}
    >
      {/* Premium Header */}
      <div className={`relative overflow-hidden`}>
        <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-95`} />
        <div className="relative px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Icon className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm tracking-tight">{title}</h3>
              {hasDelayed && (
                <div className="flex items-center gap-1 text-white/80 text-[10px] mt-0.5">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Pedidos atrasados</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {headerAction}
            <Badge className="h-7 min-w-[32px] px-2.5 text-xs font-bold bg-white/25 text-white border-white/30 backdrop-blur-sm">
              {count}
            </Badge>
          </div>
        </div>
      </div>

      {/* Header Settings Content */}
      {headerContent && (
        <div className="border-b border-inherit bg-card/50">
          {headerContent}
        </div>
      )}

      {/* Orders Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2.5">
          <AnimatePresence mode="popLayout">
            {isEmpty ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex flex-col items-center justify-center py-12 rounded-xl ${config.emptyBg}`}
              >
                <div className={`w-14 h-14 rounded-2xl ${config.iconBg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-7 h-7 ${config.iconColor} opacity-60`} />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{emptyMessage}</p>
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
