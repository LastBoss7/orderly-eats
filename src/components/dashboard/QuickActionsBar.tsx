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

const orderTypes = [
  {
    id: 'counter' as const,
    label: 'Balcão',
    shortcut: 'B',
    icon: Store,
    color: 'bg-blue-500 hover:bg-blue-600',
    description: 'Venda no balcão',
  },
  {
    id: 'takeaway' as const,
    label: 'Retirada',
    shortcut: 'R',
    icon: PackageCheck,
    color: 'bg-amber-500 hover:bg-amber-600',
    description: 'Cliente retira',
  },
  {
    id: 'table' as const,
    label: 'Mesa',
    shortcut: 'M',
    icon: UtensilsCrossed,
    color: 'bg-emerald-500 hover:bg-emerald-600',
    description: 'Mesa ou comanda',
  },
  {
    id: 'delivery' as const,
    label: 'Entrega',
    shortcut: 'D',
    icon: Bike,
    color: 'bg-purple-500 hover:bg-purple-600',
    description: 'Delivery',
  },
];

export function QuickActionsBar({ onNewOrder }: QuickActionsBarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 p-3 bg-gradient-to-r from-card to-muted/50 rounded-xl border shadow-sm"
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
                    className={`${type.color} text-white gap-1.5 h-9 px-3 shadow-sm transition-all hover:scale-105 active:scale-95`}
                    onClick={() => onNewOrder(type.id)}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden md:inline">{type.label}</span>
                    <Badge 
                      variant="secondary" 
                      className="h-5 px-1.5 text-[10px] font-bold bg-white/20 text-white border-0 ml-0.5"
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
