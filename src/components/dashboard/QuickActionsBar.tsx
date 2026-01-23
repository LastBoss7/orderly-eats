import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Store,
  PackageCheck,
  UtensilsCrossed,
  Bike,
  Keyboard,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickActionsBarProps {
  onNewOrder: (type: 'counter' | 'takeaway' | 'table' | 'delivery') => void;
}

// Revolut/Apple-inspired: Subtle, professional button styles
const orderTypes = [
  {
    id: 'counter' as const,
    label: 'Balcão',
    shortcut: 'B',
    icon: Store,
    color: 'bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600',
    description: 'Venda no balcão',
  },
  {
    id: 'takeaway' as const,
    label: 'Retirada',
    shortcut: 'R',
    icon: PackageCheck,
    color: 'bg-zinc-700 hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-500',
    description: 'Cliente retira',
  },
  {
    id: 'table' as const,
    label: 'Mesa',
    shortcut: 'M',
    icon: UtensilsCrossed,
    color: 'bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600',
    description: 'Mesa ou comanda',
  },
  {
    id: 'delivery' as const,
    label: 'Entrega',
    shortcut: 'D',
    icon: Bike,
    color: 'bg-zinc-700 hover:bg-zinc-600 dark:bg-zinc-600 dark:hover:bg-zinc-500',
    description: 'Delivery',
  },
];

export function QuickActionsBar({ onNewOrder }: QuickActionsBarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 p-3 bg-card border-b"
      >
        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium mr-1 hidden sm:inline">
            Novo Pedido:
          </span>
          
          {orderTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Tooltip key={type.id}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    className={`${type.color} text-white gap-1.5 h-8 px-3 transition-all hover:scale-[1.02] active:scale-[0.98]`}
                    onClick={() => onNewOrder(type.id)}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline text-xs">{type.label}</span>
                    <Badge 
                      variant="secondary" 
                      className="h-4 px-1 text-[9px] font-medium bg-white/15 text-white/90 border-0 ml-0.5"
                    >
                      Alt+{type.shortcut}
                    </Badge>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="flex flex-col gap-1">
                  <span className="font-medium">{type.description}</span>
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <Keyboard className="w-3 h-3" />
                    Alt + {type.shortcut}
                  </span>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Keyboard hint */}
        <div className="hidden lg:flex items-center gap-1.5 ml-auto text-xs text-muted-foreground">
          <Keyboard className="w-3.5 h-3.5" />
          <span>Alt+N: Pedido rápido</span>
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
