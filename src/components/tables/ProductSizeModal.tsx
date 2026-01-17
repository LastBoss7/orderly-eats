import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Check } from 'lucide-react';
import { ProductAddonSelector, SelectedAddon } from '@/components/products/ProductAddonSelector';

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  image_url: string | null;
  is_available: boolean;
  has_sizes?: boolean;
  price_small?: number | null;
  price_medium?: number | null;
  price_large?: number | null;
}

interface ProductSizeModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (product: Product, size: string | null, price: number, notes: string, addons?: SelectedAddon[]) => void;
  restaurantId?: string;
}

type SizeOption = 'small' | 'medium' | 'large';

export function ProductSizeModal({ product, open, onClose, onConfirm, restaurantId }: ProductSizeModalProps) {
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);

  // Reset state when product changes
  useEffect(() => {
    if (open) {
      setSelectedSize(null);
      setNotes('');
      setSelectedAddons([]);
    }
  }, [open, product?.id]);

  if (!product) return null;

  const hasSizes = product.has_sizes && (product.price_small || product.price_medium || product.price_large);

  const allSizeOptions: { key: SizeOption; label: string; price: number | null | undefined }[] = [
    { key: 'small' as SizeOption, label: 'Pequeno (P)', price: product.price_small },
    { key: 'medium' as SizeOption, label: 'Médio (M)', price: product.price_medium },
    { key: 'large' as SizeOption, label: 'Grande (G)', price: product.price_large },
  ];
  
  const sizeOptions = allSizeOptions.filter(opt => opt.price != null && opt.price > 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getBasePrice = (): number => {
    if (!hasSizes) return product.price;
    
    switch (selectedSize) {
      case 'small': return product.price_small || 0;
      case 'medium': return product.price_medium || 0;
      case 'large': return product.price_large || 0;
      default: return 0;
    }
  };

  const getAddonsTotal = (): number => {
    return selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
  };

  const getTotalPrice = (): number => {
    return getBasePrice() + getAddonsTotal();
  };

  const getSizeLabel = (size: SizeOption): string => {
    switch (size) {
      case 'small': return 'P';
      case 'medium': return 'M';
      case 'large': return 'G';
    }
  };

  const handleConfirm = () => {
    const basePrice = getBasePrice();
    const sizeLabel = selectedSize ? getSizeLabel(selectedSize) : null;
    onConfirm(product, sizeLabel, basePrice + getAddonsTotal(), notes.trim(), selectedAddons);
    handleClose();
  };

  const handleClose = () => {
    setSelectedSize(null);
    setNotes('');
    setSelectedAddons([]);
    onClose();
  };

  const canConfirm = hasSizes ? selectedSize !== null : true;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <span>{product.name}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pt-4 pb-2">
            {/* Size Selection */}
            {hasSizes && sizeOptions.length > 0 ? (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Escolha o tamanho *</Label>
                <div className="grid gap-2">
                  {sizeOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setSelectedSize(option.key)}
                      className={`
                        flex items-center justify-between p-4 rounded-xl border-2 transition-all
                        ${selectedSize === option.key 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`
                          w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
                          ${selectedSize === option.key 
                            ? 'border-primary bg-primary text-primary-foreground' 
                            : 'border-muted-foreground/30'
                          }
                        `}>
                          {selectedSize === option.key && <Check className="w-4 h-4" />}
                        </div>
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(option.price as number)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-muted/50 text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(product.price)}
                </p>
              </div>
            )}

            {/* Addons Selection */}
            {restaurantId && (
              <ProductAddonSelector
                productId={product.id}
                productCategoryId={product.category_id}
                restaurantId={restaurantId}
                selectedAddons={selectedAddons}
                onSelectionChange={setSelectedAddons}
              />
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Observação (opcional)</Label>
              <Textarea
                placeholder="Ex: Sem cebola, bem passado..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>
          </div>
        </ScrollArea>

        {/* Summary & Actions */}
        <div className="border-t pt-4 space-y-3">
          {/* Addons Summary */}
          {selectedAddons.length > 0 && (
            <div className="text-sm space-y-1 p-2 bg-muted/50 rounded-lg">
              <p className="font-medium text-xs text-muted-foreground">Adicionais selecionados:</p>
              {selectedAddons.map(addon => (
                <div key={addon.id} className="flex justify-between text-xs">
                  <span>{addon.name}</span>
                  {addon.price > 0 && <span>+{formatCurrency(addon.price)}</span>}
                </div>
              ))}
              <div className="flex justify-between font-medium pt-1 border-t border-border/50">
                <span>Subtotal adicionais:</span>
                <span>+{formatCurrency(getAddonsTotal())}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!canConfirm}
              className="flex-1"
            >
              Adicionar {getTotalPrice() > 0 && formatCurrency(getTotalPrice())}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
