import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Minus, Plus } from 'lucide-react';
import { ProductAddonSelector, SelectedAddon } from '@/components/products/ProductAddonSelector';
import { ProductSize, getSizeOptions, getProductPrice, getSizeLabel } from '@/components/products/SizeSelector';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  image_url: string | null;
  has_sizes?: boolean | null;
  price_small?: number | null;
  price_medium?: number | null;
  price_large?: number | null;
}

export interface POSCartItemAddon {
  id: string;
  name: string;
  price: number;
  groupId: string;
  groupName: string;
  quantity: number;
}

interface POSProductModalProps {
  product: Product;
  restaurantId: string;
  open: boolean;
  onConfirm: (size: ProductSize | null, quantity: number, notes: string, addons: SelectedAddon[], unitPrice: number) => void;
  onClose: () => void;
}

export function POSProductModal({ product, restaurantId, open, onConfirm, onClose }: POSProductModalProps) {
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);

  // Reset state when product changes
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setNotes('');
      setSelectedAddons([]);
      
      // Auto-select first available size
      const sizeOptions = getSizeOptions(product);
      if (sizeOptions.length > 0) {
        setSelectedSize(sizeOptions[0].size);
      } else {
        setSelectedSize(null);
      }
    }
  }, [product.id, open]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getBasePrice = (): number => {
    const sizeOptions = getSizeOptions(product);
    if (sizeOptions.length > 0 && selectedSize) {
      return getProductPrice(product, selectedSize);
    }
    return product.price;
  };

  const getAddonsTotal = () => {
    return selectedAddons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);
  };

  const getTotalPrice = () => {
    return (getBasePrice() + getAddonsTotal()) * quantity;
  };

  const handleConfirm = () => {
    const unitPrice = getBasePrice() + getAddonsTotal();
    onConfirm(selectedSize, quantity, notes, selectedAddons, unitPrice);
  };

  const sizeOptions = getSizeOptions(product);
  const hasSizes = sizeOptions.length > 0;
  const canConfirm = !hasSizes || selectedSize !== null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* Size Selection */}
          {hasSizes && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Tamanho</label>
              <div className="grid grid-cols-3 gap-2">
                {sizeOptions.map((option) => (
                  <button
                    key={option.size}
                    type="button"
                    onClick={() => setSelectedSize(option.size)}
                    className={cn(
                      'flex flex-col items-center p-3 rounded-xl border-2 transition-all',
                      selectedSize === option.size
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <span className="text-sm font-medium">{getSizeLabel(option.size).charAt(0)}</span>
                    <span className="text-xs text-muted-foreground">{getSizeLabel(option.size)}</span>
                    <span className="text-sm font-bold text-primary mt-1">
                      {formatCurrency(option.price)}
                    </span>
                  </button>
                ))}
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
            useEdgeFunction={false}
          />

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <Textarea
              placeholder="Ex: Sem cebola, bem passado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none h-20"
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantidade</label>
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
              <span className="text-2xl font-bold w-12 text-center tabular-nums">{quantity}</span>
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

        {/* Footer */}
        <div className="p-4 border-t space-y-3">
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
      </DialogContent>
    </Dialog>
  );
}
