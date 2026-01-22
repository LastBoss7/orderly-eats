// Types for the Digital Menu

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
}

export interface DaySchedule {
  day: number;
  name: string;
  enabled: boolean;
  open: string;
  close: string;
}

export interface MenuSettings {
  digital_menu_enabled: boolean;
  digital_menu_banner_url: string | null;
  digital_menu_description: string | null;
  digital_menu_delivery_enabled: boolean;
  digital_menu_pickup_enabled: boolean;
  digital_menu_min_order_value: number;
  opening_hours: DaySchedule[];
  use_opening_hours: boolean;
}

// Helper to check if restaurant is currently open
export function isRestaurantOpen(hours: DaySchedule[], useOpeningHours: boolean): { isOpen: boolean; message: string } {
  if (!useOpeningHours) {
    return { isOpen: true, message: 'Aberto' };
  }

  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);

  const todaySchedule = hours.find((h) => h.day === currentDay);

  if (!todaySchedule || !todaySchedule.enabled) {
    const nextOpenDay = findNextOpenDay(hours, currentDay);
    if (nextOpenDay) {
      return { isOpen: false, message: `Fechado • Abre ${nextOpenDay.name} às ${nextOpenDay.open}` };
    }
    return { isOpen: false, message: 'Fechado' };
  }

  if (currentTime >= todaySchedule.open && currentTime <= todaySchedule.close) {
    return { isOpen: true, message: `Aberto • Fecha às ${todaySchedule.close}` };
  }

  if (currentTime < todaySchedule.open) {
    return { isOpen: false, message: `Fechado • Abre hoje às ${todaySchedule.open}` };
  }

  const nextOpenDay = findNextOpenDay(hours, currentDay);
  if (nextOpenDay) {
    if (nextOpenDay.day === (currentDay + 1) % 7) {
      return { isOpen: false, message: `Fechado • Abre amanhã às ${nextOpenDay.open}` };
    }
    return { isOpen: false, message: `Fechado • Abre ${nextOpenDay.name} às ${nextOpenDay.open}` };
  }

  return { isOpen: false, message: 'Fechado' };
}

function findNextOpenDay(hours: DaySchedule[], currentDay: number): DaySchedule | null {
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    const schedule = hours.find((h) => h.day === nextDay);
    if (schedule && schedule.enabled) {
      return schedule;
    }
  }
  return null;
}

export const defaultOpeningHours: DaySchedule[] = [
  { day: 0, name: 'Domingo', enabled: false, open: '09:00', close: '22:00' },
  { day: 1, name: 'Segunda', enabled: true, open: '09:00', close: '22:00' },
  { day: 2, name: 'Terça', enabled: true, open: '09:00', close: '22:00' },
  { day: 3, name: 'Quarta', enabled: true, open: '09:00', close: '22:00' },
  { day: 4, name: 'Quinta', enabled: true, open: '09:00', close: '22:00' },
  { day: 5, name: 'Sexta', enabled: true, open: '09:00', close: '22:00' },
  { day: 6, name: 'Sábado', enabled: true, open: '09:00', close: '22:00' },
];

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
