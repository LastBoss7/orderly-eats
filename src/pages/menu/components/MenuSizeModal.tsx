import { Product, ProductSize, formatCurrency, getProductPrice } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState, useEffect } from 'react';
import { Minus, Plus, ShoppingCart } from 'lucide-react';

interface MenuSizeModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (size: ProductSize | null, quantity: number, notes: string) => void;
}

export function MenuSizeModal({ product, open, onClose, onConfirm }: MenuSizeModalProps) {
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

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
    }
  }, [open, product]);

  if (!product) return null;

  const handleConfirm = () => {
    onConfirm(selectedSize, quantity, notes);
    onClose();
  };

  const getSizeOptions = () => {
    const options: { size: ProductSize; label: string; price: number | null }[] = [];
    if (product.price_small) options.push({ size: 'small', label: 'Pequeno', price: product.price_small });
    if (product.price_medium) options.push({ size: 'medium', label: 'Médio', price: product.price_medium });
    if (product.price_large) options.push({ size: 'large', label: 'Grande', price: product.price_large });
    return options;
  };

  const unitPrice = getProductPrice(product, selectedSize);
  const totalPrice = unitPrice * quantity;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{product.name}</DialogTitle>
          {product.description && (
            <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Size Selection */}
          {product.has_sizes && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Escolha o tamanho</Label>
              <RadioGroup
                value={selectedSize || ''}
                onValueChange={(v) => setSelectedSize(v as ProductSize)}
                className="grid gap-2"
              >
                {getSizeOptions().map((option) => (
                  <Label
                    key={option.size}
                    htmlFor={option.size}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedSize === option.size
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value={option.size} id={option.size} />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <span className="font-bold text-primary">
                      {formatCurrency(option.price!)}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Quantidade</Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-base font-medium">
              Observações <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Ex: Sem cebola, bem passado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={product.has_sizes && !selectedSize}
            className="gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Adicionar • {formatCurrency(totalPrice)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
