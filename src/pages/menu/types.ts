// Types for the Digital Menu

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
}

export interface MenuSettings {
  digital_menu_enabled: boolean;
  digital_menu_banner_url: string | null;
  digital_menu_description: string | null;
  digital_menu_delivery_enabled: boolean;
  digital_menu_pickup_enabled: boolean;
  digital_menu_min_order_value: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  sort_order: number | null;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  is_available: boolean;
  is_featured: boolean;
  has_sizes: boolean | null;
  price_small: number | null;
  price_medium: number | null;
  price_large: number | null;
}

export type ProductSize = 'small' | 'medium' | 'large';

export interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
  size: ProductSize | null;
  unitPrice: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

export interface CouponValidation {
  valid: boolean;
  error?: string;
  coupon_id?: string;
  discount?: number;
  discount_type?: string;
  discount_value?: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  cep: string;
}

export type OrderType = 'delivery' | 'takeaway';

// Utility functions
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const getProductPrice = (product: Product, size: ProductSize | null): number => {
  if (product.has_sizes && size) {
    switch (size) {
      case 'small': return product.price_small ?? product.price;
      case 'medium': return product.price_medium ?? product.price;
      case 'large': return product.price_large ?? product.price;
    }
  }
  return product.price;
};

export const getSizeLabel = (size: ProductSize | null): string => {
  switch (size) {
    case 'small': return 'Pequeno';
    case 'medium': return 'Médio';
    case 'large': return 'Grande';
    default: return '';
  }
};

export const getMinPrice = (product: Product): number => {
  if (!product.has_sizes) return product.price;
  const prices = [
    product.price_small,
    product.price_medium,
    product.price_large,
  ].filter((p): p is number => p != null && p > 0);
  return prices.length > 0 ? Math.min(...prices) : product.price;
};
