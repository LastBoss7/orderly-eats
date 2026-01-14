import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Package, Check } from 'lucide-react';

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
  onConfirm: (product: Product, size: string | null, price: number, notes: string) => void;
}

type SizeOption = 'small' | 'medium' | 'large';

export function ProductSizeModal({ product, open, onClose, onConfirm }: ProductSizeModalProps) {
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(null);
  const [notes, setNotes] = useState('');

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

  const getSelectedPrice = (): number => {
    if (!hasSizes) return product.price;
    
    switch (selectedSize) {
      case 'small': return product.price_small || 0;
      case 'medium': return product.price_medium || 0;
      case 'large': return product.price_large || 0;
      default: return 0;
    }
  };

  const getSizeLabel = (size: SizeOption): string => {
    switch (size) {
      case 'small': return 'P';
      case 'medium': return 'M';
      case 'large': return 'G';
    }
  };

  const handleConfirm = () => {
    const price = getSelectedPrice();
    const sizeLabel = selectedSize ? getSizeLabel(selectedSize) : null;
    onConfirm(product, sizeLabel, price, notes.trim());
    handleClose();
  };

  const handleClose = () => {
    setSelectedSize(null);
    setNotes('');
    onClose();
  };

  const canConfirm = hasSizes ? selectedSize !== null : true;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
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

        <div className="space-y-4 pt-4">
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

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!canConfirm}
              className="flex-1"
            >
              Adicionar {getSelectedPrice() > 0 && formatCurrency(getSelectedPrice())}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
