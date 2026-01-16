import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  Clock, 
  GripVertical, 
  User, 
  UtensilsCrossed, 
  Bike, 
  Package, 
  Phone,
  ChevronDown,
  Truck,
  CheckCircle,
  ArrowRight,
  ChefHat,
  X,
  CreditCard,
} from 'lucide-react';

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
  updated_at: string;
  notes: string | null;
  delivery_address: string | null;
  delivery_phone: string | null;
  delivery_fee: number | null;
  order_number: number | null;
  payment_method: string | null;
  driver_id: string | null;
  waiter_id: string | null;
  order_items?: OrderItem[];
}

interface DeliveryDriver {
  id: string;
  name: string;
  phone: string | null;
}

interface OrderCardProps {
  order: Order;
  locationInfo: { label: string; type: 'table' | 'tab' } | null;
  waiterName: string | null;
  timer: { elapsed: number; limit: number; isOverdue: boolean; percentage: number } | null;
  drivers: DeliveryDriver[];
  getDriverName: (driverId: string | null) => string | null;
  getDriverPhone: (driverId: string | null) => string | null;
  formatCurrency: (value: number | null) => string;
  formatTime: (dateString: string) => string;
  formatElapsedTime: (minutes: number) => string;
  formatWhatsAppLink: (phone: string) => string;
  updateOrderStatus: (orderId: string, status: string) => void;
  updateOrderDriver: (orderId: string, driverId: string | null, order?: Order) => void;
  onOpenDetail: (order: Order) => void;
  onCloseTableOrTab?: () => void;
  showAdvanceButton?: boolean;
  showFinalizeButton?: boolean;
  showCloseButton?: boolean;
  isDelayed?: boolean;
}

export function OrderCard({
  order,
  locationInfo,
  waiterName,
  timer,
  drivers,
  getDriverName,
  getDriverPhone,
  formatCurrency,
  formatTime,
  formatElapsedTime,
  formatWhatsAppLink,
  updateOrderStatus,
  updateOrderDriver,
  onOpenDetail,
  onCloseTableOrTab,
  showAdvanceButton = false,
  showFinalizeButton = false,
  showCloseButton = false,
  isDelayed = false,
}: OrderCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const getOrderTypeIcon = (type: string | null) => {
    switch (type) {
      case 'delivery':
        return <Bike className="w-4 h-4" />;
      case 'takeaway':
        return <Package className="w-4 h-4" />;
      default:
        return <UtensilsCrossed className="w-4 h-4" />;
    }
  };

  const getOrderDisplayNumber = () => {
    if (order.order_number) {
      // Ensure we don't double the # if it's already there
      const numStr = String(order.order_number);
      return numStr.startsWith('#') ? numStr : `#${numStr}`;
    }
    return `#${order.id.slice(0, 4).toUpperCase()}`;
  };

  const getOrderTypeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      table: 'Mesa',
      delivery: 'Delivery',
      takeaway: 'Para Levar',
      counter: 'Balcão',
    };
    return labels[type || ''] || type || 'Mesa';
  };

  // New card design similar to reference
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`bg-card rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md relative ${
        isDelayed && order.status !== 'delivered' ? 'ring-2 ring-destructive' : ''
      } ${isDragging ? 'shadow-xl z-50' : ''}`}
    >
      {/* Drag Handle - on top border */}
      <div 
        {...listeners} 
        {...attributes}
        className="absolute top-2 right-2 p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Card Content - Clickable area */}
      <div 
        className="p-4 pb-3 cursor-pointer relative"
        onClick={() => onOpenDetail(order)}
      >
        {/* Header Row: Order number, Timer */}
        <div className="flex items-center justify-between mb-2 pr-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              {getOrderTypeIcon(order.order_type)}
            </div>
            <span className="font-bold text-foreground">
              Pedido {getOrderDisplayNumber()}
            </span>
          </div>
          
          {/* Timer Badge */}
          {timer && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              timer.isOverdue 
                ? 'bg-destructive/10 text-destructive border border-destructive/30' 
                : timer.percentage > 75
                  ? 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400'
            }`}>
              <Clock className="w-3 h-3" />
              <span>{String(Math.floor(timer.elapsed / 60)).padStart(2, '0')}:{String(timer.elapsed % 60).padStart(2, '0')}</span>
            </div>
          )}
          
          {/* Time badge if no timer */}
          {!timer && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatTime(order.created_at)}
            </div>
          )}
        </div>

        {/* Customer Name Row */}
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            {order.customer_name || 'Não identificado'}
          </span>
          
          {/* Total */}
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total:</div>
            <div className="font-bold text-base">{formatCurrency(order.total)}</div>
          </div>
        </div>

        {/* Payment status for ready orders */}
        {(order.status === 'ready' || order.status === 'served') && !order.payment_method && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <CreditCard className="w-3 h-3" />
            <span>• Não registrado</span>
          </div>
        )}

        {/* Waiter info */}
        {waiterName && (
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mb-2">
            <ChefHat className="w-3 h-3" />
            <span>Garçom: {waiterName}</span>
          </div>
        )}

        {/* Table or Tab location badge */}
        {locationInfo && (
          <div className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg ${
            locationInfo.type === 'table' 
              ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800' 
              : 'text-violet-700 bg-violet-100 dark:text-violet-300 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800'
          }`}>
            <UtensilsCrossed className="w-4 h-4" />
            {locationInfo.label}
          </div>
        )}

        {/* Order type badge for non-table orders */}
        {order.order_type && order.order_type !== 'table' && !locationInfo && (
          <Badge variant="outline" className="text-xs">
            {getOrderTypeIcon(order.order_type)}
            <span className="ml-1">{getOrderTypeLabel(order.order_type)}</span>
          </Badge>
        )}
      </div>

      {/* Timer Progress Bar for preparing */}
      {timer && order.status === 'preparing' && (
        <div className="px-4 pb-2">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 rounded-full ${
                timer.isOverdue 
                  ? 'bg-destructive' 
                  : timer.percentage > 75 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(timer.percentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Driver selector for delivery orders */}
      {order.order_type === 'delivery' && (
        <div className="px-4 pb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={`w-full justify-between text-xs ${
                  order.driver_id 
                    ? 'border-blue-500 text-blue-600 bg-blue-50' 
                    : 'border-dashed'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Bike className="w-3 h-3" />
                  {order.driver_id ? getDriverName(order.driver_id) : 'Selecionar motoboy'}
                </span>
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
              {drivers.length === 0 ? (
                <DropdownMenuItem disabled>
                  Nenhum motoboy cadastrado
                </DropdownMenuItem>
              ) : (
                <>
                  {drivers.map((driver) => (
                    <DropdownMenuItem
                      key={driver.id}
                      onClick={() => updateOrderDriver(order.id, driver.id, order)}
                      className={order.driver_id === driver.id ? 'bg-accent' : ''}
                    >
                      <Bike className="w-4 h-4 mr-2" />
                      {driver.name}
                    </DropdownMenuItem>
                  ))}
                  {order.driver_id && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => updateOrderDriver(order.id, null)}
                        className="text-destructive"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remover motoboy
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* WhatsApp button for assigned driver */}
          {order.driver_id && getDriverPhone(order.driver_id) && (
            <a
              href={formatWhatsAppLink(getDriverPhone(order.driver_id)!)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 text-xs text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1.5 rounded-md transition-colors"
            >
              <Phone className="w-3 h-3" />
              <span>{getDriverPhone(order.driver_id)}</span>
            </a>
          )}
        </div>
      )}

      {/* Items preview */}
      {order.order_items && order.order_items.length > 0 && (
        <div 
          className="px-4 py-2 border-t text-xs text-muted-foreground cursor-pointer"
          onClick={() => onOpenDetail(order)}
        >
          {order.order_items.slice(0, 2).map((item) => (
            <div key={item.id} className="truncate">
              {item.quantity}x {item.product_name}
            </div>
          ))}
          {order.order_items.length > 2 && (
            <div className="text-primary">+{order.order_items.length - 2} mais itens</div>
          )}
        </div>
      )}

      {/* Delivery Status Dropdown */}
      {order.order_type === 'delivery' && order.status !== 'pending' && (
        <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={`w-full justify-between ${
                  order.status === 'out_for_delivery' 
                    ? 'border-blue-500 text-blue-600 bg-blue-50' 
                    : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  {order.status === 'preparing' && '🔥 Preparando'}
                  {order.status === 'ready' && '✅ Pronto'}
                  {order.status === 'served' && '🍽️ Servido'}
                  {order.status === 'out_for_delivery' && (
                    <>
                      <Truck className="w-4 h-4" />
                      Em entrega
                    </>
                  )}
                </span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'preparing')}>
                🔥 Preparando
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'ready')}>
                ✅ Pronto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}>
                <Truck className="w-4 h-4 mr-2" />
                Em entrega
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => updateOrderStatus(order.id, 'delivered')}
                className="text-green-600"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Finalizado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Close Table/Tab Button - Main action for ready orders */}
      {showCloseButton && locationInfo && (order.status === 'ready' || order.status === 'served') && (
        <div 
          className="px-4 pb-4" 
          onClick={(e) => e.stopPropagation()}
        >
          <Button 
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium h-11 text-sm"
            onClick={onCloseTableOrTab}
          >
            Fechar {locationInfo.type === 'table' ? 'mesa' : 'comanda'} →
          </Button>
        </div>
      )}

      {/* Action buttons for non-delivery, non-table/tab orders */}
      {showAdvanceButton && order.order_type !== 'delivery' && !showCloseButton && (
        <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="outline" 
            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => {
              const nextStatus = order.status === 'pending' 
                ? 'preparing' 
                : order.status === 'preparing' 
                  ? 'ready' 
                  : 'served';
              updateOrderStatus(order.id, nextStatus);
            }}
          >
            {order.status === 'ready' ? 'Marcar servido' : 'Avançar pedido'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Advance button for delivery in pending status */}
      {order.order_type === 'delivery' && order.status === 'pending' && (
        <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="outline" 
            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => updateOrderStatus(order.id, 'preparing')}
          >
            Aceitar pedido
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Finalize button - only for counter orders */}
      {showFinalizeButton && order.order_type === 'counter' && (
        <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="outline" 
            className="w-full border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
            onClick={() => updateOrderStatus(order.id, 'delivered')}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Produto Entregue
          </Button>
        </div>
      )}
    </div>
  );
}
