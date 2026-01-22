import React from 'react';
import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GripVertical,
  Bike,
  Package,
  UtensilsCrossed,
  User,
  Clock,
  ArrowRight,
  CheckCircle2,
  Wallet,
  MessageCircle,
} from 'lucide-react';
import { generateWhatsAppOrderLink } from '@/lib/whatsapp';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  product_price: number;
  notes: string | null;
}

interface Order {
  id: string;
  order_type: string | null;
  status: string | null;
  total: number | null;
  customer_name: string | null;
  table_id: string | null;
  tab_id: string | null;
  created_at: string;
  order_number: number | null;
  order_items?: OrderItem[];
  waiter_id?: string | null;
  delivery_phone?: string | null;
  delivery_address?: string | null;
  delivery_fee?: number | null;
  notes?: string | null;
}

interface PremiumOrderCardCompactProps {
  order: Order;
  locationLabel?: string | null;
  locationType?: 'table' | 'tab' | null;
  timer?: {
    elapsed: number;
    limit: number;
    isOverdue: boolean;
    percentage: number;
  } | null;
  waiterName?: string | null;
  isRecentlyUpdated?: boolean;
  showAdvanceButton?: boolean;
  showFinalizeButton?: boolean;
  showCloseButton?: boolean;
  onAdvance?: () => void;
  onFinalize?: () => void;
  onClose?: () => void;
  onClick?: () => void;
  restaurantName?: string;
}

export function PremiumOrderCardCompact({
  order,
  locationLabel,
  locationType,
  timer,
  waiterName,
  isRecentlyUpdated,
  showAdvanceButton,
  showFinalizeButton,
  showCloseButton,
  onAdvance,
  onFinalize,
  onClose,
  onClick,
  restaurantName,
}: PremiumOrderCardCompactProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const formatCurrency = (value: number | null) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const getOrderDisplayNumber = () => {
    if (order.order_number) {
      return `#${order.order_number}`;
    }
    return `#${order.id.slice(0, 4).toUpperCase()}`;
  };

  const getTypeIcon = () => {
    switch (order.order_type) {
      case 'delivery':
        return <Bike className="w-3.5 h-3.5" />;
      case 'takeaway':
      case 'counter':
        return <Package className="w-3.5 h-3.5" />;
      default:
        return <UtensilsCrossed className="w-3.5 h-3.5" />;
    }
  };

  const getTypeBadgeClass = () => {
    if (order.table_id) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    if (order.tab_id) return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300';
    if (order.order_type === 'delivery') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  };

  const getBorderClass = () => {
    if (order.table_id) return 'border-l-emerald-500';
    if (order.tab_id) return 'border-l-violet-500';
    if (order.order_type === 'delivery') return 'border-l-blue-500';
    return 'border-l-amber-500';
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: isDragging ? 0.5 : 1, 
        y: 0,
        scale: isDragging ? 1.02 : 1,
      }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        group relative bg-card rounded-xl border border-border/60 shadow-sm 
        hover:shadow-md hover:border-border transition-all duration-200
        border-l-[3px] ${getBorderClass()}
        ${isRecentlyUpdated ? 'ring-2 ring-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}
        ${isDragging ? 'z-50 shadow-xl' : ''}
      `}
    >
      {/* Drag Handle */}
      <div 
        {...listeners} 
        {...attributes}
        className="absolute top-2 right-1.5 p-1 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/60 z-10 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Card Content */}
      <div 
        className="p-3 cursor-pointer"
        onClick={onClick}
      >
        {/* Top Row: Type Badge, Number, Timer */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${getTypeBadgeClass()}`}>
            {getTypeIcon()}
            <span>{locationLabel || (order.order_type === 'delivery' ? 'Delivery' : 'Balcão')}</span>
          </span>
          
          <span className="font-bold text-sm text-foreground">
            {getOrderDisplayNumber()}
          </span>

          {timer && order.status === 'preparing' && (
            <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              timer.isOverdue 
                ? 'bg-destructive/10 text-destructive' 
                : timer.percentage > 75 
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' 
                  : 'bg-muted text-muted-foreground'
            }`}>
              {timer.elapsed}min
            </span>
          )}
        </div>

        {/* Middle Row: Customer/Waiter & Total */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate flex-1 min-w-0">
            <User className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {waiterName ? `${waiterName} • ` : ''}
              {order.customer_name || 'Cliente'}
            </span>
          </div>
          <span className="font-bold text-sm text-foreground flex-shrink-0">
            {formatCurrency(order.total)}
          </span>
        </div>

        {/* Timer Progress Bar */}
        {timer && order.status === 'preparing' && (
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                timer.isOverdue 
                  ? 'bg-destructive' 
                  : timer.percentage > 75 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(timer.percentage, 100)}%` }}
            />
          </div>
        )}

        {/* Action Buttons Row */}
        {(showAdvanceButton || showFinalizeButton || showCloseButton || order.delivery_phone) && (
          <div className="mt-2 pt-2 border-t border-border/50 flex gap-1.5">
            {/* WhatsApp Button */}
            {order.delivery_phone && (
              <a
                href={generateWhatsAppOrderLink(order.delivery_phone, {
                  orderId: order.id,
                  orderNumber: order.order_number,
                  customerName: order.customer_name,
                  orderType: order.order_type,
                  items: order.order_items,
                  total: order.total,
                  deliveryFee: order.delivery_fee,
                  deliveryAddress: order.delivery_address,
                  notes: order.notes,
                  status: order.status,
                  restaurantName,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-7 w-7 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                title="Enviar pedido via WhatsApp"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            )}
            {showAdvanceButton && onAdvance && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 flex-1 text-xs gap-1 text-primary hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onAdvance();
                }}
              >
                <ArrowRight className="w-3 h-3" />
                Avançar
              </Button>
            )}
            {showFinalizeButton && onFinalize && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 flex-1 text-xs gap-1 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                onClick={(e) => {
                  e.stopPropagation();
                  onFinalize();
                }}
              >
                <CheckCircle2 className="w-3 h-3" />
                Finalizar
              </Button>
            )}
            {showCloseButton && onClose && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 flex-1 text-xs gap-1 text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/40"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                <Wallet className="w-3 h-3" />
                Fechar
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
