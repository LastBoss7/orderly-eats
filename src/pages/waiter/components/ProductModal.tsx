import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Minus, Plus, X } from 'lucide-react';
import { Product, ProductSize, formatCurrency } from '../types';
import { ProductAddonSelector, SelectedAddon } from '@/components/products/ProductAddonSelector';
import { cn } from '@/lib/utils';

interface ProductModalProps {
  product: Product;
  restaurantId: string;
  onConfirm: (size: ProductSize | null, quantity: number, notes: string, addons: SelectedAddon[]) => void;
  onClose: () => void;
}

export function ProductModal({ product, restaurantId, onConfirm, onClose }: ProductModalProps) {
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);

  // Reset state when product changes
  useEffect(() => {
    setSelectedSize(null);
    setQuantity(1);
    setNotes('');
    setSelectedAddons([]);
  }, [product.id]);

  // Auto-select first available size
  useEffect(() => {
    if (product.has_sizes && !selectedSize) {
      if (product.price_small != null) setSelectedSize('small');
      else if (product.price_medium != null) setSelectedSize('medium');
      else if (product.price_large != null) setSelectedSize('large');
    }
  }, [product, selectedSize]);

  const getBasePrice = (): number => {
    if (product.has_sizes && selectedSize) {
      switch (selectedSize) {
        case 'small': return product.price_small ?? 0;
        case 'medium': return product.price_medium ?? 0;
        case 'large': return product.price_large ?? 0;
      }
    }
    return product.price ?? 0;
  };

  const getAddonsTotal = () => {
    return selectedAddons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);
  };

  const getTotalPrice = () => {
    return (getBasePrice() + getAddonsTotal()) * quantity;
  };

  const getSizeLabel = (size: ProductSize): string => {
    switch (size) {
      case 'small': return 'Pequeno (P)';
      case 'medium': return 'Médio (M)';
      case 'large': return 'Grande (G)';
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedSize, quantity, notes, selectedAddons);
  };

  const canConfirm = !product.has_sizes || selectedSize !== null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-foreground truncate">{product.name}</h3>
            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 ml-2" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-4">
            {/* Size Selection */}
            {product.has_sizes && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tamanho</label>
                <div className="grid grid-cols-3 gap-2">
                  {product.price_small != null && (
                    <button
                      type="button"
                      onClick={() => setSelectedSize('small')}
                      className={cn(
                        'flex flex-col items-center p-3 rounded-xl border-2 transition-all',
                        selectedSize === 'small'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <span className="text-sm font-medium">P</span>
                      <span className="text-xs text-muted-foreground">Pequeno</span>
                      <span className="text-sm font-bold text-primary mt-1">
                        {formatCurrency(product.price_small)}
                      </span>
                    </button>
                  )}
                  {product.price_medium != null && (
                    <button
                      type="button"
                      onClick={() => setSelectedSize('medium')}
                      className={cn(
                        'flex flex-col items-center p-3 rounded-xl border-2 transition-all',
                        selectedSize === 'medium'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <span className="text-sm font-medium">M</span>
                      <span className="text-xs text-muted-foreground">Médio</span>
                      <span className="text-sm font-bold text-primary mt-1">
                        {formatCurrency(product.price_medium)}
                      </span>
                    </button>
                  )}
                  {product.price_large != null && (
                    <button
                      type="button"
                      onClick={() => setSelectedSize('large')}
                      className={cn(
                        'flex flex-col items-center p-3 rounded-xl border-2 transition-all',
                        selectedSize === 'large'
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <span className="text-sm font-medium">G</span>
                      <span className="text-xs text-muted-foreground">Grande</span>
                      <span className="text-sm font-bold text-primary mt-1">
                        {formatCurrency(product.price_large)}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Addons */}
            <ProductAddonSelector
              productId={product.id}
              productCategoryId={product.category_id}
              restaurantId={restaurantId}
              selectedAddons={selectedAddons}
              onSelectionChange={setSelectedAddons}
              useEdgeFunction={true}
            />

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Observações</label>
              <Textarea
                placeholder="Ex: Sem cebola, bem passado..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none h-20"
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Quantidade</label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Selected addons summary */}
            {selectedAddons.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Adicionais selecionados:</p>
                {selectedAddons.map(addon => (
                  <div key={addon.id} className="flex justify-between text-sm">
                    <span>{addon.quantity > 1 ? `${addon.quantity}x ` : ''}{addon.name}</span>
                    <span className="text-primary">+{formatCurrency(addon.price * addon.quantity)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t space-y-3 shrink-0">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(getTotalPrice())}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!canConfirm}>
              Adicionar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
