// Types for the Waiter App
export interface Waiter {
  id: string;
  name: string;
  status: string;
  restaurant_id?: string;
}

export interface ExternalRestaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface Table {
  id: string;
  number: number;
  status: 'available' | 'occupied' | 'closing';
  capacity: number | null;
}

export interface Tab {
  id: string;
  number: number;
  customer_name: string | null;
  customer_phone: string | null;
  status: 'available' | 'occupied' | 'closing';
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category_id: string | null;
  is_available: boolean;
  has_sizes?: boolean | null;
  price_small?: number | null;
  price_medium?: number | null;
  price_large?: number | null;
  image_url?: string | null;
}

export type ProductSize = 'small' | 'medium' | 'large';

export interface CartItemAddon {
  id: string;
  name: string;
  price: number;
  groupId: string;
  groupName: string;
  quantity: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
  size?: ProductSize | null;
  unitPrice: number;
  addons?: CartItemAddon[];
}

export interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  notes: string | null;
}

export interface Order {
  id: string;
  order_number: number | null;
  table_id: string | null;
  tab_id: string | null;
  order_type: string;
  status: string;
  total: number;
  created_at: string;
  notes: string | null;
  customer_name: string | null;
  delivery_address: string | null;
  delivery_phone: string | null;
  delivery_fee: number | null;
  waiter_id: string | null;
  order_items?: OrderItem[];
  tables?: { number: number } | null;
  tabs?: { number: number; customer_name: string | null } | null;
  waiters?: { id: string; name: string } | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  cep: string | null;
}

export interface DeliveryForm {
  customerName: string;
  customerPhone: string;
  address: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  cep: string;
  deliveryFee: number;
}

export type AppView = 'login' | 'tables' | 'order' | 'delivery' | 'delivery-order' | 'table-orders' | 'tab-orders';
export type OrderMode = 'table' | 'delivery' | 'takeaway' | 'tab';
export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';

// Helper functions
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const getProductPrice = (product: Product, size: ProductSize | null): number => {
  if (product.has_sizes && size) {
    switch (size) {
      case 'small': return product.price_small ?? product.price ?? 0;
      case 'medium': return product.price_medium ?? product.price ?? 0;
      case 'large': return product.price_large ?? product.price ?? 0;
      default: return product.price ?? 0;
    }
  }
  if (product.has_sizes && !size) {
    const availablePrices = [
      product.price_small,
      product.price_medium,
      product.price_large,
    ].filter((p): p is number => p != null && p > 0);
    return availablePrices.length > 0 ? Math.min(...availablePrices) : product.price ?? 0;
  }
  return product.price ?? 0;
};

export const getSizeLabel = (size: ProductSize | null | undefined): string => {
  switch (size) {
    case 'small': return 'P';
    case 'medium': return 'M';
    case 'large': return 'G';
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
