import { Product, formatCurrency, getMinPrice } from '../types';
import { Card } from '@/components/ui/card';
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
    <Card className="overflow-hidden group hover:shadow-md transition-all duration-200 bg-card flex flex-row h-28 sm:h-32">
      {/* Product Image */}
      <div className="relative w-28 sm:w-32 h-full flex-shrink-0 bg-muted overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-2xl opacity-30">🍽️</span>
          </div>
        )}

        {/* Featured Badge */}
        {product.is_featured && (
          <Badge className="absolute top-1 left-1 bg-amber-500 hover:bg-amber-600 gap-0.5 text-[10px] px-1.5 py-0.5">
            <Sparkles className="w-2.5 h-2.5" />
            Destaque
          </Badge>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm line-clamp-1">{product.name}</h3>
          {product.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto">
          <div className="min-w-0">
            {hasMultiplePrices && (
              <span className="text-[10px] text-muted-foreground">a partir de </span>
            )}
            <span className="font-bold text-sm text-primary">
              {formatCurrency(displayPrice)}
            </span>
          </div>

          <Button
            size="sm"
            className="h-8 px-3 text-xs shrink-0"
            onClick={() => onAddToCart(product)}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
      </div>
    </Card>
  );
}
