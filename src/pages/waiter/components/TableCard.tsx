import { motion } from 'framer-motion';
import { Users, ChefHat } from 'lucide-react';
import { Table } from '../types';
import { cn } from '@/lib/utils';

interface TableCardProps {
  table: Table;
  hasReadyOrders?: boolean;
  onClick: () => void;
}

export function TableCard({ table, hasReadyOrders, onClick }: TableCardProps) {
  const statusColors = {
    available: 'bg-card border-border hover:border-primary/50',
    occupied: 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700',
    closing: 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700',
  };

  const statusTextColors = {
    available: 'text-muted-foreground',
    occupied: 'text-amber-600 dark:text-amber-400',
    closing: 'text-rose-600 dark:text-rose-400',
  };

  const statusLabels = {
    available: 'Disponível',
    occupied: 'Ocupada',
    closing: 'Fechando',
  };

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        'relative w-full p-4 rounded-2xl border-2 text-left transition-all shadow-sm hover:shadow-md',
        statusColors[table.status]
      )}
    >
      {hasReadyOrders && (
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
          <ChefHat className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      
      <div className="text-2xl font-bold text-foreground mb-1">
        Mesa {table.number}
      </div>
      
      <div className="flex items-center justify-between">
        <span className={cn('text-sm font-medium', statusTextColors[table.status])}>
          {statusLabels[table.status]}
        </span>
        {table.capacity && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            {table.capacity}
          </span>
        )}
      </div>
    </motion.button>
  );
}
