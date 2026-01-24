import { Product, ProductSize, CartItemAddon, formatCurrency, getProductPrice } from '../types';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState, useEffect } from 'react';
import { Minus, Plus, ShoppingCart, Check } from 'lucide-react';
import { ProductAddonSelector, SelectedAddon } from '@/components/products/ProductAddonSelector';

interface MenuSizeModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (size: ProductSize | null, quantity: number, notes: string, addons?: CartItemAddon[]) => void;
  restaurantId?: string;
}

export function MenuSizeModal({ product, open, onClose, onConfirm, restaurantId }: MenuSizeModalProps) {
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);

  useEffect(() => {
    if (open && product) {
      // Auto-select first available size
      if (product.has_sizes) {
        if (product.price_small) setSelectedSize('small');
        else if (product.price_medium) setSelectedSize('medium');
        else if (product.price_large) setSelectedSize('large');
        else setSelectedSize(null);
      } else {
        setSelectedSize(null);
      }
      setQuantity(1);
      setNotes('');
      setSelectedAddons([]);
    }
  }, [open, product]);

  if (!product) return null;

  const handleConfirm = () => {
    const addonsWithQuantity: CartItemAddon[] = selectedAddons.map(a => ({
      ...a,
      quantity: a.quantity,
    }));
    onConfirm(selectedSize, quantity, notes, addonsWithQuantity.length > 0 ? addonsWithQuantity : undefined);
    onClose();
  };

  const getSizeOptions = () => {
    const options: { size: ProductSize; label: string; price: number | null }[] = [];
    if (product.price_small) options.push({ size: 'small', label: 'Pequeno', price: product.price_small });
    if (product.price_medium) options.push({ size: 'medium', label: 'Médio', price: product.price_medium });
    if (product.price_large) options.push({ size: 'large', label: 'Grande', price: product.price_large });
    return options;
  };

  const getAddonsTotal = () => {
    return selectedAddons.reduce((sum, addon) => sum + (addon.price * addon.quantity), 0);
  };

  const unitPrice = getProductPrice(product, selectedSize) + getAddonsTotal();
  const totalPrice = unitPrice * quantity;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-lg flex flex-col max-h-[85vh]">
          <DrawerHeader className="pb-2 shrink-0">
            <div className="flex gap-3">
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0 text-left">
                <DrawerTitle className="text-base leading-tight">{product.name}</DrawerTitle>
                {product.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                )}
              </div>
            </div>
          </DrawerHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-4 pb-4 space-y-5">
              {/* Size Selection */}
              {product.has_sizes && (
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium">Escolha o tamanho *</Label>
                  <RadioGroup
                    value={selectedSize || ''}
                    onValueChange={(v) => setSelectedSize(v as ProductSize)}
                    className="space-y-2"
                  >
                    {getSizeOptions().map((option) => (
                      <label
                        key={option.size}
                        className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition-all ${
                          selectedSize === option.size
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border active:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedSize === option.size ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                          }`}>
                            {selectedSize === option.size && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="font-medium text-sm">{option.label}</span>
                        </div>
                        <span className="font-bold text-primary text-sm">
                          {formatCurrency(option.price!)}
                        </span>
                        <RadioGroupItem value={option.size} className="sr-only" />
                      </label>
                    ))}
                  </RadioGroup>
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
                  useEdgeFunction={true}
                />
              )}

              {/* Quantity */}
              <div className="space-y-2.5">
                <Label className="text-sm font-medium">Quantidade</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="text-xl font-bold w-10 text-center">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2.5">
                <Label className="text-sm font-medium">
                  Observações <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Textarea
                  placeholder="Ex: Sem cebola, bem passado..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none text-sm min-h-[60px]"
                  rows={2}
                />
              </div>

              {/* Addons Summary */}
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

          <DrawerFooter className="pt-2 pb-6 shrink-0">
            <Button
              size="lg"
              className="w-full h-12 text-sm font-medium gap-2"
              onClick={handleConfirm}
              disabled={product.has_sizes && !selectedSize}
            >
              <ShoppingCart className="w-4 h-4" />
              Adicionar • {formatCurrency(totalPrice)}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
