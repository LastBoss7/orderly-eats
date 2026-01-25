import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Package,
  Calculator,
  Loader2,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  unit_name: string;
  current_stock: number;
  cost_price: number | null;
}

type MovementType = 'in' | 'out' | 'adjustment';

interface PremiumMovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem | null;
  initialType?: MovementType;
  onSave: (data: {
    type: MovementType;
    quantity: number;
    reason: string;
    notes: string;
    costPrice: number;
  }) => Promise<void>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export function PremiumMovementModal({
  open,
  onOpenChange,
  item,
  initialType = 'in',
  onSave,
}: PremiumMovementModalProps) {
  const [type, setType] = useState<MovementType>(initialType);
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [costPrice, setCostPrice] = useState(item?.cost_price || 0);
  const [saving, setSaving] = useState(false);

  // Reset form when item changes
  useState(() => {
    if (item) {
      setQuantity(initialType === 'adjustment' ? item.current_stock : 0);
      setCostPrice(item.cost_price || 0);
    }
  });

  const handleSave = async () => {
    if (quantity <= 0 && type !== 'adjustment') return;
    
    setSaving(true);
    try {
      await onSave({ type, quantity, reason, notes, costPrice });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  if (!item) return null;

  const calculateNewStock = () => {
    switch (type) {
      case 'in': return item.current_stock + quantity;
      case 'out': return Math.max(0, item.current_stock - quantity);
      case 'adjustment': return quantity;
    }
  };

  const newStock = calculateNewStock();
  const isNegative = type === 'out' && quantity > item.current_stock;

  const typeConfig = {
    in: {
      icon: ArrowDownCircle,
      title: 'Entrada de Estoque',
      subtitle: 'Registre a entrada de novos produtos',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500',
      lightBg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    out: {
      icon: ArrowUpCircle,
      title: 'Saída de Estoque',
      subtitle: 'Registre a saída de produtos',
      color: 'text-rose-500',
      bgColor: 'bg-rose-500',
      lightBg: 'bg-rose-50 dark:bg-rose-950/30',
    },
    adjustment: {
      icon: RefreshCw,
      title: 'Ajuste de Estoque',
      subtitle: 'Corrija a quantidade atual',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500',
      lightBg: 'bg-amber-50 dark:bg-amber-950/30',
    },
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden">
        {/* Header com gradiente */}
        <div className={cn("relative px-6 py-5", config.lightBg)}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-lg", config.bgColor)}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">{config.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">{config.subtitle}</p>
              </div>
            </div>
          </DialogHeader>
          
          {/* Item info */}
          <div className="mt-4 p-3 bg-background/80 backdrop-blur rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Package className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{item.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Estoque atual: <span className="font-semibold text-foreground">{item.current_stock} {item.unit_name}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tipo de movimentação */}
        <div className="px-6 pt-4">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tipo de movimentação
          </Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(['in', 'out', 'adjustment'] as MovementType[]).map((t) => {
              const c = typeConfig[t];
              const TIcon = c.icon;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setType(t);
                    if (t === 'adjustment') {
                      setQuantity(item.current_stock);
                    } else {
                      setQuantity(0);
                    }
                  }}
                  className={cn(
                    "relative flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
                    type === t
                      ? cn("border-current", c.color, c.lightBg)
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  )}
                >
                  <TIcon className={cn("w-5 h-5", type === t ? c.color : "text-muted-foreground")} />
                  <span className={cn("text-xs font-medium", type === t ? c.color : "text-muted-foreground")}>
                    {t === 'in' ? 'Entrada' : t === 'out' ? 'Saída' : 'Ajuste'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          {/* Quantity input */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-muted-foreground" />
              {type === 'adjustment' ? 'Novo estoque' : 'Quantidade'}
              <span className="text-xs text-muted-foreground">({item.unit_name})</span>
            </Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              min={0}
              step="0.01"
              className={cn("h-12 text-lg font-semibold tabular-nums", isNegative && "border-destructive")}
              placeholder="0"
            />
            {isNegative && (
              <p className="text-xs text-destructive">
                Quantidade maior que o estoque disponível
              </p>
            )}
          </div>
          
          {/* Cost price for entries */}
          <AnimatePresence>
            {type === 'in' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <Label>Custo unitário</Label>
                <Input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                  min={0}
                  step="0.01"
                  className="h-11"
                  placeholder="0,00"
                />
                {quantity > 0 && costPrice > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Total: {formatCurrency(quantity * costPrice)}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Reason */}
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={type === 'in' ? 'Ex: Compra de fornecedor' : type === 'out' ? 'Ex: Perda, Vencido' : 'Ex: Inventário físico'}
              className="h-11"
            />
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações adicionais..."
              rows={2}
              className="resize-none"
            />
          </div>
          
          {/* Preview */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Estoque anterior:</span>
                <span className="ml-2 font-medium">{item.current_stock} {item.unit_name}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Novo estoque:</span>
                <span className={cn("ml-2 font-bold text-lg", config.color)}>
                  {newStock.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {item.unit_name}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className={cn("flex-1", config.bgColor, "hover:opacity-90")}
            onClick={handleSave}
            disabled={saving || (quantity <= 0 && type !== 'adjustment') || isNegative}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Icon className="w-4 h-4 mr-2" />
            )}
            Confirmar {type === 'in' ? 'Entrada' : type === 'out' ? 'Saída' : 'Ajuste'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
