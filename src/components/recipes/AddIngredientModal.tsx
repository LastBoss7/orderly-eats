import { useState, useMemo } from "react";
import { motion } from "framer-motion";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChefHat,
  Package,
  Plus,
  Trash2,
  Search,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  unit_name: string;
  current_stock: number;
  cost_price: number | null;
  category: string | null;
}

interface ProductRecipe {
  id: string;
  inventory_item_id: string;
  quantity: number;
  inventory_items?: InventoryItem;
}

interface Product {
  id: string;
  name: string;
  has_sizes: boolean | null;
  price: number;
  price_small: number | null;
  price_medium: number | null;
  price_large: number | null;
}

interface AddIngredientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  size: string | null;
  inventoryItems: InventoryItem[];
  currentRecipes: ProductRecipe[];
  onAdd: (ingredientId: string, quantity: number) => Promise<void>;
  onRemove: (recipeId: string) => Promise<void>;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const getSizeLabel = (size: string | null) => {
  switch (size) {
    case 'small': return 'Pequeno';
    case 'medium': return 'Médio';
    case 'large': return 'Grande';
    default: return 'Tamanho único';
  }
};

export function AddIngredientModal({
  open,
  onOpenChange,
  product,
  size,
  inventoryItems,
  currentRecipes,
  onAdd,
  onRemove,
}: AddIngredientModalProps) {
  const [search, setSearch] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const term = search.toLowerCase();
    return inventoryItems.filter(item =>
      item.name.toLowerCase().includes(term) ||
      (item.category && item.category.toLowerCase().includes(term))
    );
  }, [inventoryItems, search]);

  const groupedItems = useMemo(() => {
    const groups: { [key: string]: InventoryItem[] } = {};
    filteredItems.forEach(item => {
      const category = item.category || 'Sem categoria';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const handleAdd = async () => {
    if (!selectedIngredient || quantity <= 0) return;
    
    setSaving(true);
    try {
      await onAdd(selectedIngredient.id, quantity);
      setSelectedIngredient(null);
      setQuantity(0);
      setSearch('');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (recipeId: string) => {
    setRemoving(recipeId);
    try {
      await onRemove(recipeId);
    } finally {
      setRemoving(null);
    }
  };

  const calculateTotalCost = () => {
    return currentRecipes.reduce((total, recipe) => {
      const cost = recipe.inventory_items?.cost_price || 0;
      return total + (cost * recipe.quantity);
    }, 0);
  };

  if (!product) return null;

  const price = size === 'small' ? product.price_small :
    size === 'medium' ? product.price_medium :
    size === 'large' ? product.price_large :
    product.price;

  const totalCost = calculateTotalCost();
  const margin = price && price > 0 ? ((price - totalCost) / price) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] p-0 flex flex-col">
        {/* Header */}
        <div className="relative px-6 py-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">{product.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">{getSizeLabel(size)}</p>
              </div>
            </div>
          </DialogHeader>
          
          {/* Summary */}
          <div className="mt-4 flex gap-4">
            <div className="flex-1 p-3 bg-background/80 backdrop-blur rounded-lg border">
              <p className="text-xs text-muted-foreground">Custo Total</p>
              <p className="text-lg font-bold">{formatCurrency(totalCost)}</p>
            </div>
            <div className="flex-1 p-3 bg-background/80 backdrop-blur rounded-lg border">
              <p className="text-xs text-muted-foreground">Preço de Venda</p>
              <p className="text-lg font-bold">{price ? formatCurrency(price) : '-'}</p>
            </div>
            <div className={cn(
              "flex-1 p-3 bg-background/80 backdrop-blur rounded-lg border",
              margin >= 50 ? "border-emerald-200 dark:border-emerald-800" : 
              margin >= 30 ? "border-amber-200 dark:border-amber-800" : 
              "border-rose-200 dark:border-rose-800"
            )}>
              <p className="text-xs text-muted-foreground">Margem</p>
              <p className={cn(
                "text-lg font-bold",
                margin >= 50 ? "text-emerald-600" : margin >= 30 ? "text-amber-600" : "text-rose-600"
              )}>
                {margin.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Current ingredients */}
          {currentRecipes.length > 0 && (
            <div className="px-6 py-4 border-b">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
                Ingredientes atuais ({currentRecipes.length})
              </Label>
              <div className="space-y-2">
                {currentRecipes.map((recipe) => (
                  <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 group"
                  >
                    <div className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium text-sm">{recipe.inventory_items?.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums">
                        {recipe.quantity} {recipe.inventory_items?.unit_name}
                      </span>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {formatCurrency((recipe.inventory_items?.cost_price || 0) * recipe.quantity)}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemove(recipe.id)}
                        disabled={removing === recipe.id}
                      >
                        {removing === recipe.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          
          {/* Add new ingredient */}
          <div className="flex-1 px-6 py-4 flex flex-col min-h-0">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
              Adicionar ingrediente
            </Label>
            
            {inventoryItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum item de estoque cadastrado.
                </p>
                <a href="/inventory" className="text-sm text-primary hover:underline mt-1">
                  Cadastrar itens no estoque →
                </a>
              </div>
            ) : selectedIngredient ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-4 rounded-lg border bg-primary/5 border-primary/20">
                  <Package className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <h4 className="font-medium">{selectedIngredient.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Estoque: {selectedIngredient.current_stock} {selectedIngredient.unit_name}
                      {selectedIngredient.cost_price && ` • ${formatCurrency(selectedIngredient.cost_price)}/${selectedIngredient.unit_name}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedIngredient(null)}
                  >
                    Trocar
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>Quantidade ({selectedIngredient.unit_name})</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    min={0}
                    step="0.001"
                    className="h-12 text-lg font-semibold"
                    placeholder="0"
                    autoFocus
                  />
                  {quantity > 0 && selectedIngredient.cost_price && (
                    <p className="text-xs text-muted-foreground">
                      Custo: {formatCurrency(selectedIngredient.cost_price * quantity)}
                    </p>
                  )}
                </div>
                
                <Button
                  className="w-full h-11"
                  onClick={handleAdd}
                  disabled={saving || quantity <= 0}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Adicionar Ingrediente
                </Button>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar ingrediente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
                
                {/* Items list */}
                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-4 pb-4">
                    {Object.entries(groupedItems).map(([category, items]) => (
                      <div key={category}>
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                          {category}
                        </h5>
                        <div className="grid gap-2">
                          {items.map((item) => {
                            const isAlreadyAdded = currentRecipes.some(
                              r => r.inventory_item_id === item.id
                            );
                            
                            return (
                              <button
                                key={item.id}
                                disabled={isAlreadyAdded}
                                onClick={() => setSelectedIngredient(item)}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                                  isAlreadyAdded
                                    ? "opacity-50 cursor-not-allowed bg-muted/30"
                                    : "hover:bg-muted/50 hover:border-primary/30"
                                )}
                              >
                                <Package className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.current_stock} {item.unit_name}
                                    {item.cost_price && ` • ${formatCurrency(item.cost_price)}/${item.unit_name}`}
                                  </p>
                                </div>
                                {isAlreadyAdded ? (
                                  <Badge variant="secondary" className="text-[10px]">
                                    Adicionado
                                  </Badge>
                                ) : (
                                  <Plus className="w-4 h-4 text-muted-foreground" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    
                    {filteredItems.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        Nenhum ingrediente encontrado
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
