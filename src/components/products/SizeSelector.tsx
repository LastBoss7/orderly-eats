import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ProductSize = 'small' | 'medium' | 'large';

export interface SizeOption {
  size: ProductSize;
  label: string;
  shortLabel: string;
  price: number;
}

interface SizeSelectorProps {
  sizes: SizeOption[];
  selectedSize: ProductSize | null;
  onSelectSize: (size: ProductSize) => void;
  formatCurrency: (value: number) => string;
  compact?: boolean;
}

export function SizeSelector({ 
  sizes, 
  selectedSize, 
  onSelectSize, 
  formatCurrency,
  compact = false 
}: SizeSelectorProps) {
  if (sizes.length === 0) return null;

  return (
    <div className={cn("flex gap-2", compact ? "flex-row" : "flex-col")}>
      {sizes.map(({ size, label, shortLabel, price }) => (
        <Button
          key={size}
          type="button"
          variant={selectedSize === size ? 'default' : 'outline'}
          size={compact ? 'sm' : 'default'}
          className={cn(
            "flex-1",
            compact ? "min-w-0 px-2" : "justify-between"
          )}
          onClick={() => onSelectSize(size)}
        >
          <span className={cn("font-medium", compact && "text-xs")}>
            {compact ? shortLabel : label}
          </span>
          <span className={cn(
            "font-bold",
            compact ? "ml-1 text-xs" : "ml-2",
            selectedSize === size ? "text-primary-foreground" : "text-primary"
          )}>
            {formatCurrency(price)}
          </span>
        </Button>
      ))}
    </div>
  );
}

export function getSizeOptions(product: {
  has_sizes?: boolean | null;
  price: number;
  price_small?: number | null;
  price_medium?: number | null;
  price_large?: number | null;
}): SizeOption[] {
  if (!product.has_sizes) return [];

  const options: SizeOption[] = [];

  if (product.price_small != null) {
    options.push({
      size: 'small',
      label: 'Pequeno (P)',
      shortLabel: 'P',
      price: product.price_small,
    });
  }

  if (product.price_medium != null) {
    options.push({
      size: 'medium',
      label: 'Médio (M)',
      shortLabel: 'M',
      price: product.price_medium,
    });
  }

  if (product.price_large != null) {
    options.push({
      size: 'large',
      label: 'Grande (G)',
      shortLabel: 'G',
      price: product.price_large,
    });
  }

  return options;
}

export function getSizeLabel(size: ProductSize | null | undefined): string {
  switch (size) {
    case 'small': return 'P';
    case 'medium': return 'M';
    case 'large': return 'G';
    default: return '';
  }
}

export function getProductPrice(
  product: {
    has_sizes?: boolean | null;
    price: number;
    price_small?: number | null;
    price_medium?: number | null;
    price_large?: number | null;
  },
  size: ProductSize | null
): number {
  if (!product.has_sizes || !size) {
    return product.price;
  }

  switch (size) {
    case 'small':
      return product.price_small ?? product.price;
    case 'medium':
      return product.price_medium ?? product.price;
    case 'large':
      return product.price_large ?? product.price;
    default:
      return product.price;
  }
}
