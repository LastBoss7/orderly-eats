import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Settings2,
  TrendingDown,
  TrendingUp,
  Package,
  MoreVertical,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit_name: string;
  current_stock: number;
  minimum_stock: number | null;
  maximum_stock: number | null;
  cost_price: number | null;
}

interface PremiumStockCardProps {
  item: InventoryItem;
  onEntry: () => void;
  onExit: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function PremiumStockCard({
  item,
  onEntry,
  onExit,
  onEdit,
  onDelete,
}: PremiumStockCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const isLowStock = item.minimum_stock && item.current_stock <= item.minimum_stock;
  const isOutOfStock = item.current_stock <= 0;
  const stockPercentage = item.maximum_stock 
    ? Math.min(100, (item.current_stock / item.maximum_stock) * 100)
    : null;
  
  const getStockStatus = () => {
    if (isOutOfStock) return { label: "Esgotado", color: "bg-destructive", textColor: "text-destructive" };
    if (isLowStock) return { label: "Baixo", color: "bg-amber-500", textColor: "text-amber-500" };
    return { label: "Normal", color: "bg-emerald-500", textColor: "text-emerald-500" };
  };
  
  const status = getStockStatus();
  const totalValue = item.current_stock * (item.cost_price || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn(
        "relative group bg-card rounded-xl border transition-all duration-300",
        isHovered && "shadow-lg border-primary/30",
        isOutOfStock && "border-destructive/30 bg-destructive/5",
        isLowStock && !isOutOfStock && "border-amber-500/30"
      )}
    >
      {/* Status indicator bar */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 rounded-t-xl", status.color)} />
      
      <div className="p-4 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate pr-2">{item.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              {item.category && (
                <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                  {item.category}
                </Badge>
              )}
              {item.sku && (
                <span className="text-[10px] text-muted-foreground">
                  SKU: {item.sku}
                </span>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 -mr-2 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onEdit}>
                <Settings2 className="w-4 h-4 mr-2" />
                Editar item
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Stock display - Premium */}
        <div className="bg-muted/50 rounded-lg p-3 mb-3">
          <div className="flex items-end justify-between mb-2">
            <div>
              <span className="text-3xl font-bold tabular-nums">
                {item.current_stock.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
              </span>
              <span className="text-sm text-muted-foreground ml-1">{item.unit_name}</span>
            </div>
            <div className={cn("flex items-center gap-1 text-xs font-medium", status.textColor)}>
              {isLowStock ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5" />
              )}
              {status.label}
            </div>
          </div>
          
          {/* Progress bar */}
          {stockPercentage !== null && (
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stockPercentage}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={cn("h-full rounded-full", status.color)}
              />
            </div>
          )}
          
          {item.minimum_stock && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Mínimo: {item.minimum_stock} {item.unit_name}
            </p>
          )}
        </div>
        
        {/* Value display */}
        <div className="flex items-center justify-between text-sm mb-4">
          <div className="text-muted-foreground">
            <span>Custo: </span>
            <span className="font-medium text-foreground">
              {item.cost_price ? formatCurrency(item.cost_price) : "-"}
            </span>
            <span className="text-xs text-muted-foreground">/{item.unit_name}</span>
          </div>
          <div className="font-semibold">
            {formatCurrency(totalValue)}
          </div>
        </div>
        
        {/* Quick actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950"
            onClick={onEntry}
          >
            <ArrowDownCircle className="w-4 h-4 mr-1.5" />
            Entrada
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300 dark:border-rose-800 dark:hover:bg-rose-950"
            onClick={onExit}
          >
            <ArrowUpCircle className="w-4 h-4 mr-1.5" />
            Saída
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Empty state component
export function EmptyStockState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
        <Package className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Seu estoque está vazio</h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        Comece adicionando seus primeiros insumos para ter controle total do seu inventário.
      </p>
      <Button onClick={onAdd} size="lg" className="gap-2">
        <Package className="w-4 h-4" />
        Adicionar primeiro item
      </Button>
    </motion.div>
  );
}
