import { Product, formatCurrency, getMinPrice } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface MenuProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

export function MenuProductCard({ product, onAddToCart }: MenuProductCardProps) {
  const displayPrice = getMinPrice(product);
  const hasMultiplePrices = product.has_sizes;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="group relative flex gap-3 p-3 bg-card rounded-2xl border border-border/50 hover:border-border hover:shadow-lg hover:shadow-black/5 transition-all duration-300"
    >
      {/* Product Image */}
      <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <span className="text-3xl opacity-20">🍽️</span>
          </div>
        )}

        {/* Featured Badge */}
        {product.is_featured && (
          <div className="absolute top-1.5 left-1.5">
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] px-1.5 py-0.5 gap-0.5 shadow-sm">
              <Star className="w-2.5 h-2.5 fill-current" />
              Destaque
            </Badge>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between gap-2 mt-auto pt-2">
          <div className="space-y-0.5">
            {hasMultiplePrices && (
              <span className="text-[10px] text-muted-foreground block">a partir de</span>
            )}
            <span className="font-bold text-foreground text-base">
              {formatCurrency(displayPrice)}
            </span>
          </div>

          <Button
            size="sm"
            className="h-9 px-4 text-xs font-semibold gap-1.5 rounded-xl shadow-sm hover:shadow-md transition-all"
            onClick={() => onAddToCart(product)}
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
