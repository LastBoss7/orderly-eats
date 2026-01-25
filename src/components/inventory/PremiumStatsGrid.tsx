import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  History,
  DollarSign,
  BarChart3,
} from "lucide-react";

interface StatsProps {
  totalItems: number;
  lowStockItems: number;
  totalValue: number;
  recentMovements: number;
  className?: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function PremiumStatsGrid({
  totalItems,
  lowStockItems,
  totalValue,
  recentMovements,
  className,
}: StatsProps) {
  const stats = [
    {
      label: 'Total de Itens',
      value: totalItems.toString(),
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      trend: null,
    },
    {
      label: 'Estoque Baixo',
      value: lowStockItems.toString(),
      icon: AlertTriangle,
      color: lowStockItems > 0 ? 'text-amber-500' : 'text-emerald-500',
      bgColor: lowStockItems > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
      trend: lowStockItems > 0 ? 'warning' : 'success',
    },
    {
      label: 'Valor em Estoque',
      value: formatCurrency(totalValue),
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      trend: null,
    },
    {
      label: 'Movimentações (7d)',
      value: recentMovements.toString(),
      icon: History,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      trend: null,
    },
  ];

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-4", className)}>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "relative overflow-hidden rounded-xl border bg-card p-4",
              stat.trend === 'warning' && "border-amber-200 dark:border-amber-800"
            )}
          >
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-24 h-24 transform translate-x-8 -translate-y-8">
              <div className={cn("w-full h-full rounded-full opacity-10", stat.bgColor.replace('/10', ''))} />
            </div>
            
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bgColor)}>
                  <Icon className={cn("w-5 h-5", stat.color)} />
                </div>
                {stat.trend === 'warning' && (
                  <span className="text-[10px] font-medium text-amber-500 uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-full">
                    Atenção
                  </span>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className={cn("text-2xl font-bold", stat.color === 'text-primary' ? '' : stat.color)}>
                {stat.value}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// Recipe stats
interface RecipeStatsProps {
  totalProducts: number;
  withRecipe: number;
  withoutRecipe: number;
  className?: string;
}

export function PremiumRecipeStats({
  totalProducts,
  withRecipe,
  withoutRecipe,
  className,
}: RecipeStatsProps) {
  const percentage = totalProducts > 0 ? (withRecipe / totalProducts) * 100 : 0;

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-4", className)}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border bg-card p-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Produtos</p>
            <p className="text-3xl font-bold">{totalProducts}</p>
          </div>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border bg-card p-5"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Com Ficha Técnica</p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-emerald-500">{withRecipe}</p>
              <p className="text-sm text-muted-foreground mb-1">({percentage.toFixed(0)}%)</p>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-emerald-500 rounded-full"
          />
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          "rounded-xl border bg-card p-5",
          withoutRecipe > 0 && "border-amber-200 dark:border-amber-800"
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            withoutRecipe > 0 ? "bg-amber-500/10" : "bg-emerald-500/10"
          )}>
            {withoutRecipe > 0 ? (
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            ) : (
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sem Ficha Técnica</p>
            <p className={cn(
              "text-3xl font-bold",
              withoutRecipe > 0 ? "text-amber-500" : "text-emerald-500"
            )}>
              {withoutRecipe}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
