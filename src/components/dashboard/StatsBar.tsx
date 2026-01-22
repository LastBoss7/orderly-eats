import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  Bike,
  UtensilsCrossed,
  Package,
  User,
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
  totalRevenue,
  totalOrders,
  avgPrepTime,
  orderCounts,
}: StatsBarProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const stats = [
    {
      label: 'Faturamento Hoje',
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    },
    {
      label: 'Pedidos Ativos',
      value: orderCounts.all.toString(),
      icon: ShoppingBag,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/40',
    },
    {
      label: 'Tempo Médio',
      value: `${avgPrepTime}min`,
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-900/40',
    },
  ];

  const orderTypes = [
    { label: 'Mesa', count: orderCounts.table, icon: UtensilsCrossed, color: 'text-emerald-600' },
    { label: 'Comanda', count: orderCounts.tab, icon: User, color: 'text-violet-600' },
    { label: 'Delivery', count: orderCounts.delivery, icon: Bike, color: 'text-blue-600' },
    { label: 'Balcão', count: orderCounts.counter, icon: Package, color: 'text-amber-600' },
  ];

  return (
    <div className="bg-card/50 backdrop-blur-sm border-b px-4 py-2.5">
      <div className="flex items-center justify-between gap-6">
        {/* Main Stats */}
        <div className="flex items-center gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3"
            >
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {stat.label}
                </p>
                <p className="text-lg font-bold text-foreground leading-tight">
                  {stat.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Order Type Breakdown */}
        <div className="hidden xl:flex items-center gap-4 text-sm">
          {orderTypes.map((type) => (
            <div key={type.label} className="flex items-center gap-1.5">
              <type.icon className={`w-4 h-4 ${type.color}`} />
              <span className="text-muted-foreground">{type.label}:</span>
              <span className="font-semibold">{type.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
