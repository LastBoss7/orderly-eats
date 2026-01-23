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
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 bg-card border-border/50 flex flex-row h-[120px] sm:h-[140px]">
      {/* Product Image */}
      <div className="relative w-[100px] sm:w-[130px] h-full flex-shrink-0 bg-muted overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
            <span className="text-3xl opacity-40">🍽️</span>
          </div>
        )}

        {/* Featured Badge */}
        {product.is_featured && (
          <Badge className="absolute top-1.5 left-1.5 bg-amber-500 hover:bg-amber-600 gap-0.5 text-[10px] px-1.5 py-0.5 shadow-sm">
            <Sparkles className="w-2.5 h-2.5" />
            Destaque
          </Badge>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
        <div className="min-w-0 space-y-1">
          <h3 className="font-semibold text-sm sm:text-base line-clamp-1 text-foreground">{product.name}</h3>
          {product.description && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="min-w-0">
            {hasMultiplePrices && (
              <span className="text-[10px] sm:text-xs text-muted-foreground block">a partir de</span>
            )}
            <span className="font-bold text-base sm:text-lg text-primary">
              {formatCurrency(displayPrice)}
            </span>
          </div>

          <Button
            size="sm"
            className="h-9 w-9 sm:h-9 sm:w-auto sm:px-4 rounded-full sm:rounded-md shrink-0 shadow-sm"
            onClick={() => onAddToCart(product)}
          >
            <Plus className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline text-xs font-medium">Adicionar</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
