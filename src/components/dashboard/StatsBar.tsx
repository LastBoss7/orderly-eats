import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Clock, 
  Bike,
  UtensilsCrossed,
  Package,
  User,
  CheckCircle,
} from 'lucide-react';

interface StatsBarProps {
  totalRevenue: number;
  totalOrders: number;
  avgPrepTime: number;
  orderCounts: {
    all: number;
    delivery: number;
    counter: number;
    table: number;
    tab: number;
  };
}

export function StatsBar({
  totalOrders,
  avgPrepTime,
  orderCounts,
}: StatsBarProps) {
  const stats = [
    {
      label: 'Pedidos Ativos',
      value: orderCounts.all.toString(),
      icon: ShoppingBag,
    },
    {
      label: 'Tempo Médio',
      value: `${avgPrepTime}min`,
      icon: Clock,
    },
    {
      label: 'Total do Dia',
      value: totalOrders.toString(),
      icon: CheckCircle,
    },
  ];

  const orderTypes = [
    { label: 'Mesa', count: orderCounts.table, icon: UtensilsCrossed },
    { label: 'Comanda', count: orderCounts.tab, icon: User },
    { label: 'Delivery', count: orderCounts.delivery, icon: Bike },
    { label: 'Balcão', count: orderCounts.counter, icon: Package },
  ];

  return (
    <div className="bg-card border-b px-4 py-2.5">
      <div className="flex items-center justify-between gap-6">
        {/* Main Stats - Clean, minimal Revolut-style */}
        <div className="flex items-center gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {stat.label}
                </p>
                <p className="text-lg font-semibold text-foreground leading-tight">
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Order Type Breakdown - Subtle, minimal */}
        <div className="hidden xl:flex items-center gap-5 text-sm">
          {orderTypes.map((type) => (
            <div key={type.label} className="flex items-center gap-1.5">
              <type.icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <span className="text-muted-foreground">{type.label}:</span>
              <span className="font-medium text-foreground">{type.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
