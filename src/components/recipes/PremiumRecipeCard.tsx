import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChefHat,
  Plus,
  Trash2,
  ChevronDown,
  DollarSign,
  TrendingUp,
  Package,
  Utensils,
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  unit_name: string;
  current_stock: number;
  cost_price: number | null;
}

interface ProductRecipe {
  id: string;
  product_id: string;
  inventory_item_id: string;
  product_size: string | null;
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
  categories?: { name: string } | null;
}

interface PremiumRecipeCardProps {
  product: Product;
  recipes: {
    [size: string]: ProductRecipe[];
  };
  onAddIngredient: (product: Product, size: string | null) => void;
  onRemoveIngredient: (recipeId: string) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const getSizeLabel = (size: string | null) => {
  switch (size) {
    case 'small': return 'P';
    case 'medium': return 'M';
    case 'large': return 'G';
    default: return 'Único';
  }
};

const getSizeFullLabel = (size: string | null) => {
  switch (size) {
    case 'small': return 'Pequeno';
    case 'medium': return 'Médio';
    case 'large': return 'Grande';
    default: return 'Tamanho único';
  }
};

export function PremiumRecipeCard({
  product,
  recipes,
  onAddIngredient,
  onRemoveIngredient,
}: PremiumRecipeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const calculateCost = (sizeRecipes: ProductRecipe[]) => {
    return sizeRecipes.reduce((total, recipe) => {
      const cost = recipe.inventory_items?.cost_price || 0;
      return total + (cost * recipe.quantity);
    }, 0);
  };
  
  const calculateTotalIngredients = () => {
    return Object.values(recipes).reduce((total, sizeRecipes) => total + sizeRecipes.length, 0);
  };
  
  const sizes = product.has_sizes ? ['small', 'medium', 'large'] : ['default'];
  const totalIngredients = calculateTotalIngredients();
  
  // Calcular margem de lucro
  const getMargin = (cost: number, price: number) => {
    if (price <= 0) return 0;
    return ((price - cost) / price) * 100;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl border overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center flex-shrink-0">
          <ChefHat className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        </div>
        
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{product.name}</h3>
            {product.categories?.name && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {product.categories.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Utensils className="w-3.5 h-3.5" />
              {totalIngredients} ingredientes
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              {formatCurrency(product.price)}
            </span>
          </div>
        </div>
        
        {product.has_sizes && (
          <div className="flex gap-1">
            {['small', 'medium', 'large'].map((size) => (
              <span
                key={size}
                className={cn(
                  "w-6 h-6 rounded-full text-[10px] font-medium flex items-center justify-center",
                  (recipes[size]?.length || 0) > 0
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {getSizeLabel(size)}
              </span>
            ))}
          </div>
        )}
        
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>
      
      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-3">
              {sizes.map((size) => {
                const sizeRecipes = recipes[size] || [];
                const cost = calculateCost(sizeRecipes);
                const price = size === 'small' ? product.price_small :
                  size === 'medium' ? product.price_medium :
                  size === 'large' ? product.price_large :
                  product.price;
                const margin = getMargin(cost, price || 0);
                
                return (
                  <div
                    key={size}
                    className="rounded-lg border bg-muted/20 overflow-hidden"
                  >
                    {/* Size header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "w-8 h-8 rounded-lg font-semibold text-sm flex items-center justify-center",
                          sizeRecipes.length > 0 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {getSizeLabel(size === 'default' ? null : size)}
                        </span>
                        <div>
                          <span className="font-medium text-sm">
                            {getSizeFullLabel(size === 'default' ? null : size)}
                          </span>
                          {price && (
                            <span className="text-xs text-muted-foreground ml-2">
                              Venda: {formatCurrency(price)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {sizeRecipes.length > 0 && (
                          <div className="text-right">
                            <div className="text-sm">
                              Custo: <span className="font-semibold">{formatCurrency(cost)}</span>
                            </div>
                            {margin > 0 && (
                              <div className={cn(
                                "text-xs flex items-center justify-end gap-1",
                                margin >= 50 ? "text-emerald-600" : margin >= 30 ? "text-amber-600" : "text-rose-600"
                              )}>
                                <TrendingUp className="w-3 h-3" />
                                Margem: {margin.toFixed(0)}%
                              </div>
                            )}
                          </div>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddIngredient(product, size === 'default' ? null : size);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    </div>
                    
                    {/* Ingredients list */}
                    {sizeRecipes.length > 0 ? (
                      <div className="divide-y">
                        {sizeRecipes.map((recipe) => (
                          <div
                            key={recipe.id}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {recipe.inventory_items?.name}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <span className="text-sm tabular-nums">
                                {recipe.quantity} {recipe.inventory_items?.unit_name}
                              </span>
                              <span className="text-sm text-muted-foreground tabular-nums w-20 text-right">
                                {formatCurrency((recipe.inventory_items?.cost_price || 0) * recipe.quantity)}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveIngredient(recipe.id);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        Nenhum ingrediente cadastrado
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Card para produto sem ficha técnica
interface ProductWithoutRecipeCardProps {
  product: Product;
  onClick: () => void;
}

export function ProductWithoutRecipeCard({ product, onClick }: ProductWithoutRecipeCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100/50 dark:hover:bg-amber-950/40 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-800/50 transition-colors">
          <Plus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{product.name}</h4>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(product.price)}
            {product.has_sizes && ' • Com tamanhos'}
          </p>
        </div>
        {product.categories?.name && (
          <Badge variant="outline" className="text-[10px] h-5 border-amber-300 dark:border-amber-700">
            {product.categories.name}
          </Badge>
        )}
      </div>
    </motion.button>
  );
}
