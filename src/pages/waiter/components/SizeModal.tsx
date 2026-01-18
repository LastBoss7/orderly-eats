import { Button } from '@/components/ui/button';
import { Product, ProductSize, formatCurrency } from '../types';

interface SizeModalProps {
  product: Product;
  onSelectSize: (size: ProductSize) => void;
  onClose: () => void;
}

export function SizeModal({ product, onSelectSize, onClose }: SizeModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-foreground">Escolha o tamanho</h3>
        <p className="text-sm text-muted-foreground">{product.name}</p>
        
        <div className="space-y-2">
          {product.price_small != null && (
            <Button
              variant="outline"
              className="w-full justify-between h-14"
              onClick={() => onSelectSize('small')}
            >
              <span>Pequeno (P)</span>
              <span className="font-bold text-primary">{formatCurrency(product.price_small)}</span>
            </Button>
          )}
          {product.price_medium != null && (
            <Button
              variant="outline"
              className="w-full justify-between h-14"
              onClick={() => onSelectSize('medium')}
            >
              <span>Médio (M)</span>
              <span className="font-bold text-primary">{formatCurrency(product.price_medium)}</span>
            </Button>
          )}
          {product.price_large != null && (
            <Button
              variant="outline"
              className="w-full justify-between h-14"
              onClick={() => onSelectSize('large')}
            >
              <span>Grande (G)</span>
              <span className="font-bold text-primary">{formatCurrency(product.price_large)}</span>
            </Button>
          )}
        </div>
        
        <Button variant="ghost" className="w-full" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
