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
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 bg-card">
      {/* Product Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-4xl opacity-30">🍽️</span>
          </div>
        )}

        {/* Featured Badge */}
        {product.is_featured && (
          <Badge className="absolute top-2 left-2 bg-amber-500 hover:bg-amber-600 gap-1">
            <Sparkles className="w-3 h-3" />
            Destaque
          </Badge>
        )}

        {/* Add Button Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Button
            size="lg"
            className="bg-primary hover:bg-primary/90 shadow-lg"
            onClick={() => onAddToCart(product)}
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-base line-clamp-1">{product.name}</h3>
        {product.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-3">
          <div>
            {hasMultiplePrices && (
              <span className="text-xs text-muted-foreground">a partir de </span>
            )}
            <span className="font-bold text-lg text-primary">
              {formatCurrency(displayPrice)}
            </span>
          </div>

          {/* Mobile Add Button */}
          <Button
            size="sm"
            className="sm:hidden"
            onClick={() => onAddToCart(product)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
