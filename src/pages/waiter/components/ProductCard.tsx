import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { Product, formatCurrency, getMinPrice } from '../types';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  quantity: number;
  viewMode: 'list' | 'grid';
  onClick: () => void;
}

export function ProductCard({ product, quantity, viewMode, onClick }: ProductCardProps) {
  const displayPrice = getMinPrice(product);
  const hasQuantity = quantity > 0;

  if (viewMode === 'grid') {
    return (
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className={cn(
          'relative flex flex-col items-center p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 text-center transition-all min-w-0',
          hasQuantity
            ? 'border-primary bg-primary/5'
            : 'border-transparent bg-card shadow-sm hover:shadow-md'
        )}
      >
        {hasQuantity && (
          <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-primary rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-primary-foreground shadow-lg">
            {quantity}
          </div>
        )}
        
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-muted flex items-center justify-center mb-1.5 sm:mb-2 flex-shrink-0">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover rounded-lg sm:rounded-xl"
            />
          ) : (
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
          )}
        </div>
        
        <p className="text-xs sm:text-sm font-medium text-foreground line-clamp-2 mb-0.5 sm:mb-1 w-full truncate px-0.5">
          {product.name}
        </p>
        
        <p className="text-xs sm:text-sm font-bold text-primary">
          {product.has_sizes && (
            <span className="text-[9px] sm:text-[10px] font-normal text-muted-foreground mr-0.5">
              a partir de
            </span>
          )}
          {formatCurrency(displayPrice)}
        </p>
      </motion.button>
    );
  }

  // List view
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex items-center justify-between w-full p-4 rounded-xl border-2 text-left transition-all',
        hasQuantity
          ? 'border-primary bg-primary/5'
          : 'border-transparent bg-card shadow-sm hover:shadow-md'
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-muted flex-shrink-0 flex items-center justify-center">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover rounded-xl"
            />
          ) : (
            <ShoppingCart className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{product.name}</p>
          <p className="text-sm font-bold text-primary">
            {product.has_sizes ? (
              <>
                <span className="text-xs font-normal text-muted-foreground mr-1">
                  a partir de
                </span>
                {formatCurrency(displayPrice)}
              </>
            ) : (
              formatCurrency(displayPrice)
            )}
          </p>
        </div>
      </div>
      
      {hasQuantity && (
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground ml-2">
          {quantity}
        </div>
      )}
    </motion.button>
  );
}
