import { motion } from 'framer-motion';
import { User, Phone } from 'lucide-react';
import { Tab } from '../types';
import { cn } from '@/lib/utils';

interface TabCardProps {
  tab: Tab;
  onClick: () => void;
}

export function TabCard({ tab, onClick }: TabCardProps) {
  const isOccupied = tab.status === 'occupied';
  
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        'relative w-full p-4 rounded-2xl border-2 text-left transition-all shadow-sm hover:shadow-md',
        isOccupied 
          ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
          : 'bg-card border-border hover:border-primary/50'
      )}
    >
      <div className="text-xl font-bold text-foreground mb-1">
        #{tab.number}
      </div>
      
      {tab.customer_name ? (
        <div className="space-y-0.5">
          <p className="flex items-center gap-1.5 text-sm text-foreground">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            {tab.customer_name}
          </p>
          {tab.customer_phone && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="w-3 h-3" />
              {tab.customer_phone}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isOccupied ? 'Em uso' : 'Disponível'}
        </p>
      )}
    </motion.button>
  );
}
