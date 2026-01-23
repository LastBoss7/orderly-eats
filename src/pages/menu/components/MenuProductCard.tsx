import { Product, formatCurrency, getMinPrice } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Sparkles } from 'lucide-react';

interface MenuProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function MenuProductCard({ product, onAddToCart }: MenuProductCardProps) {
  const displayPrice = getMinPrice(product);
  const hasMultiplePrices = product.has_sizes;

  return (
    <div className="flex gap-3 p-3 bg-card border border-border rounded-xl">
      {/* Product Image */}
      <div className="relative w-[100px] h-[100px] flex-shrink-0 rounded-lg overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl opacity-30">🍽️</span>
          </div>
        )}

        {/* Featured Badge */}
        {product.is_featured && (
          <Badge className="absolute top-1 left-1 bg-amber-500 hover:bg-amber-500 text-[9px] px-1.5 py-0.5 gap-0.5">
            <Sparkles className="w-2.5 h-2.5" />
            Destaque
          </Badge>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h3 className="font-semibold text-sm leading-tight line-clamp-2">{product.name}</h3>
          {product.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between gap-2 mt-2">
          <div>
            {hasMultiplePrices && (
              <span className="text-[10px] text-muted-foreground block">a partir de</span>
            )}
            <span className="font-bold text-primary text-base">
              {formatCurrency(displayPrice)}
            </span>
          </div>

          <Button
            size="sm"
            className="h-8 px-3 text-xs font-medium gap-1.5 rounded-lg"
            onClick={() => onAddToCart(product)}
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}
