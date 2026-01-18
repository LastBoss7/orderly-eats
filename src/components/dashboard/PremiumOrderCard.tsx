import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  ChefHat,
  ArrowRight,
  X,
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

interface Timer {
  elapsed: number;
  elapsedSeconds: number;
  limit: number;
  isOverdue: boolean;
  percentage: number;
  isStopped: boolean;
}

interface PremiumOrderCardProps {
  order: Order;
  locationInfo: { label: string; type: 'table' | 'tab' } | null;
  waiterName: string | null;
  timer: Timer | null;
  drivers: DeliveryDriver[];
  getDriverName: (driverId: string | null) => string | null;
  getDriverPhone: (driverId: string | null) => string | null;
  formatCurrency: (value: number | null) => string;
  formatTime: (dateString: string) => string;
  formatWhatsAppLink: (phone: string) => string;
  updateOrderStatus: (orderId: string, status: string) => void;
  updateOrderDriver: (orderId: string, driverId: string | null, order?: Order) => void;
  onOpenDetail: (order: Order) => void;
  onCloseTableOrTab?: () => void;
  showAdvanceButton?: boolean;
  showFinalizeButton?: boolean;
  showCloseButton?: boolean;
  isDelayed?: boolean;
  isCompact?: boolean;
  isRecentlyUpdated?: boolean;
}

export function PremiumOrderCard({
  order,
  locationInfo,
  waiterName,
  timer,
  drivers,
  getDriverName,
  getDriverPhone,
  formatCurrency,
  formatTime,
  formatWhatsAppLink,
  updateOrderStatus,
  updateOrderDriver,
  onOpenDetail,
  onCloseTableOrTab,
  showAdvanceButton = false,
  showFinalizeButton = false,
  showCloseButton = false,
  isDelayed = false,
  isCompact = false,
  isRecentlyUpdated = false,
}: PremiumOrderCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
  });

  const style = transform && isDragging ? {
    transform: CSS.Translate.toString(transform),
    opacity: 0.6,
    zIndex: 50,
  } : undefined;

  const getOrderTypeIcon = (type: string | null) => {
    switch (type) {
      case 'delivery':
        return <Bike className="w-4 h-4" />;
      case 'takeaway':
        return <Package className="w-4 h-4" />;
      case 'counter':
        return <Package className="w-4 h-4" />;
      default:
        return <UtensilsCrossed className="w-4 h-4" />;
    }
  };

  const getOrderDisplayNumber = () => {
    if (order.order_number) {
      return `#${order.order_number}`;
    }
    return `#${order.id.slice(0, 4).toUpperCase()}`;
  };

  const formatElapsedTimeWithSeconds = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Compact mode card
  if (isCompact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group relative bg-card rounded-lg border transition-all hover:shadow-md ${
          isDelayed ? 'border-destructive/50 bg-destructive/5' : 'hover:border-primary/30'
        } ${isDragging ? 'opacity-50' : ''} ${isRecentlyUpdated ? 'ring-2 ring-emerald-500/50' : ''}`}
      >
        <div
          {...listeners}
          {...attributes}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 cursor-grab text-muted-foreground/40 hover:text-muted-foreground transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <div 
          className="flex items-center gap-3 p-3 pr-8 cursor-pointer"
          onClick={() => onOpenDetail(order)}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center">
            {getOrderTypeIcon(order.order_type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{getOrderDisplayNumber()}</span>
              {locationInfo && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                  locationInfo.type === 'table' 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                }`}>
                  {locationInfo.label}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {order.customer_name || 'Não identificado'}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="font-bold text-sm">{formatCurrency(order.total)}</span>
            {timer && (
              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                timer.isStopped
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : timer.isOverdue
                    ? 'bg-destructive/10 text-destructive'
                    : timer.percentage > 75
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground'
              }`}>
                {formatElapsedTimeWithSeconds(timer.elapsedSeconds)}
              </span>
            )}
          </div>
        </div>

        {/* Quick actions for compact mode */}
        {(showAdvanceButton || showFinalizeButton) && (
          <div className="px-3 pb-3 pt-0" onClick={(e) => e.stopPropagation()}>
            {showAdvanceButton && order.order_type !== 'delivery' && !showCloseButton && (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => {
                  const nextStatus = order.status === 'pending' ? 'preparing' : order.status === 'preparing' ? 'ready' : 'served';
                  updateOrderStatus(order.id, nextStatus);
                }}
              >
                {order.status === 'ready' ? 'Servido' : 'Avançar'} →
              </Button>
            )}
            {showFinalizeButton && (order.order_type === 'counter' || order.order_type === 'takeaway') && !order.table_id && !order.tab_id && (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs border-emerald-500/50 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                onClick={() => updateOrderStatus(order.id, 'delivered')}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Entregue
              </Button>
            )}
            {showCloseButton && locationInfo && (
              <Button
                size="sm"
                className="w-full h-7 text-xs bg-sky-500 hover:bg-sky-600 text-white"
                onClick={onCloseTableOrTab}
              >
                Fechar {locationInfo.type === 'table' ? 'mesa' : 'comanda'} →
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full mode card
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-card rounded-xl border overflow-hidden transition-all hover:shadow-lg ${
        isDelayed ? 'border-destructive/50 shadow-destructive/10' : 'hover:border-primary/20'
      } ${isDragging ? 'opacity-50 shadow-xl' : ''} ${isRecentlyUpdated ? 'ring-2 ring-emerald-500/40' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute right-3 top-3 p-1 opacity-0 group-hover:opacity-100 cursor-grab text-muted-foreground/40 hover:text-muted-foreground transition-opacity z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Delayed indicator */}
      {isDelayed && order.status === 'preparing' && (
        <div className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground text-xs font-bold text-center py-1.5 px-3">
          ⚠️ Pedido atrasado
        </div>
      )}

      {/* Main content */}
      <div 
        className="p-4 cursor-pointer"
        onClick={() => onOpenDetail(order)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3 pr-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-sm">
              {getOrderTypeIcon(order.order_type)}
            </div>
            <div>
              <span className="font-bold text-base block">{getOrderDisplayNumber()}</span>
              {waiterName && (
                <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <ChefHat className="w-3 h-3" />
                  {waiterName}
                </span>
              )}
            </div>
          </div>
          
          {/* Timer */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
            timer?.isStopped
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : timer?.isOverdue
                ? 'bg-destructive/10 text-destructive'
                : timer && timer.percentage > 75
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono font-semibold">
              {timer ? formatElapsedTimeWithSeconds(timer.elapsedSeconds) : formatTime(order.created_at)}
            </span>
          </div>
        </div>

        {/* Customer & Total */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            <span className="truncate max-w-[140px]">{order.customer_name || 'Não identificado'}</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-lg">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Location Badge */}
        {locationInfo && (
          <div className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg mb-3 ${
            locationInfo.type === 'table' 
              ? 'text-emerald-700 bg-emerald-100/80 dark:text-emerald-300 dark:bg-emerald-900/30' 
              : 'text-violet-700 bg-violet-100/80 dark:text-violet-300 dark:bg-violet-900/30'
          }`}>
            <UtensilsCrossed className="w-4 h-4" />
            {locationInfo.label}
          </div>
        )}

        {/* Order type for non-table */}
        {order.order_type && !locationInfo && order.order_type !== 'table' && (
          <Badge variant="secondary" className="text-xs mb-3">
            {getOrderTypeIcon(order.order_type)}
            <span className="ml-1.5">
              {order.order_type === 'delivery' ? 'Delivery' : order.order_type === 'counter' ? 'Balcão' : 'Para Levar'}
            </span>
          </Badge>
        )}
      </div>

      {/* Progress bar for preparing */}
      {timer && order.status === 'preparing' && !isDelayed && (
        <div className="px-4 pb-3">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 rounded-full ${
                timer.percentage > 75 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(timer.percentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Driver selector for delivery */}
      {order.order_type === 'delivery' && (
        <div className="px-4 pb-3 space-y-2" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={`w-full justify-between text-sm ${
                  order.driver_id 
                    ? 'border-blue-500/50 text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' 
                    : 'border-dashed'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Bike className="w-4 h-4" />
                  {order.driver_id ? getDriverName(order.driver_id) : 'Selecionar motoboy'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[180px]">
              {drivers.length === 0 ? (
                <DropdownMenuItem disabled>Nenhum motoboy cadastrado</DropdownMenuItem>
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
                        Remover
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {order.driver_id && getDriverPhone(order.driver_id) && (
            <a
              href={formatWhatsAppLink(getDriverPhone(order.driver_id)!)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 px-3 py-2 rounded-lg transition-colors font-medium"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{getDriverPhone(order.driver_id)}</span>
            </a>
          )}
        </div>
      )}

      {/* Items preview */}
      {order.order_items && order.order_items.length > 0 && (
        <div 
          className="px-4 py-2.5 border-t bg-muted/30 text-xs text-muted-foreground cursor-pointer"
          onClick={() => onOpenDetail(order)}
        >
          {order.order_items.slice(0, 2).map((item) => (
            <div key={item.id} className="truncate">
              {item.quantity}x {item.product_name}
            </div>
          ))}
          {order.order_items.length > 2 && (
            <div className="text-primary font-medium mt-0.5">+{order.order_items.length - 2} itens</div>
          )}
        </div>
      )}

      {/* Delivery status dropdown */}
      {order.order_type === 'delivery' && order.status !== 'pending' && (
        <div className="px-4 pb-3" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={`w-full justify-between ${
                  order.status === 'out_for_delivery' ? 'border-blue-500/50 text-blue-600 bg-blue-50/50' : ''
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
            <DropdownMenuContent align="start" className="w-[180px]">
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
                className="text-emerald-600"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Finalizado
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        {showCloseButton && locationInfo && (
          <Button 
            className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold"
            onClick={onCloseTableOrTab}
          >
            Fechar {locationInfo.type === 'table' ? 'mesa' : 'comanda'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {showAdvanceButton && order.order_type !== 'delivery' && !showCloseButton && (
          <Button 
            variant="outline" 
            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold"
            onClick={() => {
              const nextStatus = order.status === 'pending' ? 'preparing' : order.status === 'preparing' ? 'ready' : 'served';
              updateOrderStatus(order.id, nextStatus);
            }}
          >
            {order.status === 'ready' ? 'Marcar servido' : 'Avançar pedido'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {order.order_type === 'delivery' && order.status === 'pending' && (
          <Button 
            variant="outline" 
            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold"
            onClick={() => updateOrderStatus(order.id, 'preparing')}
          >
            Aceitar pedido
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {showFinalizeButton && (order.order_type === 'counter' || order.order_type === 'takeaway') && !order.table_id && !order.tab_id && (
          <Button 
            variant="outline" 
            className="w-full border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white font-semibold"
            onClick={() => updateOrderStatus(order.id, 'delivered')}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Produto Entregue
          </Button>
        )}

        {showFinalizeButton && (order.table_id || order.tab_id) && order.status === 'ready' && !showCloseButton && (
          <Button 
            variant="outline" 
            className="w-full border-violet-500 text-violet-600 hover:bg-violet-500 hover:text-white font-semibold"
            onClick={() => updateOrderStatus(order.id, 'served')}
          >
            Marcar como servido
          </Button>
        )}
      </div>
    </div>
  );
}
