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

  // Calculate remaining time for countdown display
  const formatCountdown = (timer: Timer | null, limitMinutes: number) => {
    if (!timer) return null;
    const remainingSeconds = Math.max(0, (limitMinutes * 60) - timer.elapsedSeconds);
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getPaymentMethodLabel = (method: string | null) => {
    switch (method) {
      case 'credit': return 'Cartão';
      case 'debit': return 'Débito';
      case 'pix': return 'PIX';
      case 'cash': return 'Dinheiro';
      case 'mixed': return 'Misto';
      default: return null;
    }
  };

  // Full mode card - Clean design like reference
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-white dark:bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden transition-all hover:shadow-md ${
        isDragging ? 'opacity-50 shadow-xl' : ''
      } ${isRecentlyUpdated ? 'ring-2 ring-emerald-500/40' : ''}`}
    >
      {/* Drag Handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute right-2 top-2 p-1 opacity-0 group-hover:opacity-100 cursor-grab text-muted-foreground/40 hover:text-muted-foreground transition-opacity z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Header - Order number and time */}
      <div 
        className="p-3 pb-2 cursor-pointer"
        onClick={() => onOpenDetail(order)}
      >
        <div className="flex items-center justify-between pr-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center">
              {getOrderTypeIcon(order.order_type)}
            </div>
            <span className="font-bold text-base text-foreground">
              Pedido {getOrderDisplayNumber()}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 bg-muted/60 text-muted-foreground px-2 py-1 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            {formatTime(order.created_at)}
          </div>
        </div>
      </div>

      {/* Countdown timer bar */}
      {timer && order.status === 'preparing' && (
        <div 
          className={`mx-3 mb-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-center ${
            timer.isOverdue || isDelayed
              ? 'bg-destructive/10 text-destructive'
              : timer.percentage > 75
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-primary/10 text-primary'
          }`}
        >
          Prepare em até {formatCountdown(timer, timer.limit)}
        </div>
      )}

      {/* Delayed warning */}
      {isDelayed && order.status === 'preparing' && (
        <div className="mx-3 mb-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-center bg-destructive text-destructive-foreground">
          ⚠️ Pedido atrasado
        </div>
      )}

      {/* Customer info */}
      <div 
        className="px-3 pb-2 cursor-pointer"
        onClick={() => onOpenDetail(order)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {order.customer_name || 'Não identificado'}
            </p>
            {order.delivery_phone && (
              <p className="text-xs text-muted-foreground">
                {order.delivery_phone}
              </p>
            )}
            {waiterName && (
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                <ChefHat className="w-3 h-3" />
                {waiterName}
              </p>
            )}
          </div>
          {order.order_items && order.order_items.length > 0 && (
            <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              {order.order_items.reduce((acc, item) => acc + item.quantity, 0)}
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border/50 mx-3" />

      {/* Total and payment */}
      <div 
        className="px-3 py-2 cursor-pointer"
        onClick={() => onOpenDetail(order)}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total:</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-foreground">{formatCurrency(order.total)}</span>
            {getPaymentMethodLabel(order.payment_method) && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                💳 {getPaymentMethodLabel(order.payment_method)}
              </span>
            )}
          </div>
        </div>
        
        {!order.payment_method && order.status !== 'pending' && (
          <button 
            className="text-xs text-primary hover:underline mt-1"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(order);
            }}
          >
            Registrar pagamento
          </button>
        )}
      </div>

      {/* Location (table/tab) */}
      {locationInfo && (
        <div className="px-3 pb-2">
          <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${
            locationInfo.type === 'table' 
              ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30' 
              : 'text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-900/30'
          }`}>
            <UtensilsCrossed className="w-3 h-3" />
            {locationInfo.label}
          </div>
        </div>
      )}

      {/* Delivery address */}
      {order.order_type === 'delivery' && order.delivery_address && (
        <div className="px-3 pb-2">
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
            <Bike className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{order.delivery_address}</span>
          </div>
        </div>
      )}

      {/* Driver selector for delivery */}
      {order.order_type === 'delivery' && order.status !== 'pending' && (
        <div className="px-3 pb-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className={`w-full justify-between text-xs h-8 ${
                  order.driver_id 
                    ? 'border-blue-500/50 text-blue-600 bg-blue-50/50 dark:bg-blue-900/20' 
                    : 'border-dashed'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5" />
                  {order.driver_id ? getDriverName(order.driver_id) : 'Selecionar motoboy'}
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
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
              className="flex items-center gap-2 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 px-2 py-1.5 rounded-lg transition-colors font-medium"
            >
              <Phone className="w-3 h-3" />
              <span>{getDriverPhone(order.driver_id)}</span>
            </a>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="px-3 pb-3 pt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {/* NF Button placeholder */}
        {order.status !== 'pending' && (
          <Button 
            variant="outline" 
            size="sm"
            className="h-9 px-3 text-xs font-bold border-amber-500 text-amber-600 hover:bg-amber-50"
            onClick={() => onOpenDetail(order)}
          >
            NF
          </Button>
        )}

        {/* Main action button */}
        {showCloseButton && locationInfo ? (
          <Button 
            className="flex-1 h-9 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm"
            onClick={onCloseTableOrTab}
          >
            Fechar {locationInfo.type === 'table' ? 'mesa' : 'comanda'}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : showAdvanceButton && order.order_type !== 'delivery' ? (
          <Button 
            className="flex-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm"
            onClick={() => {
              const nextStatus = order.status === 'pending' ? 'preparing' : order.status === 'preparing' ? 'ready' : 'served';
              updateOrderStatus(order.id, nextStatus);
            }}
          >
            {order.status === 'ready' ? 'Servido' : 'Avançar'}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : order.order_type === 'delivery' && order.status === 'pending' ? (
          <Button 
            className="flex-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm"
            onClick={() => updateOrderStatus(order.id, 'preparing')}
          >
            Aceitar pedido
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : order.order_type === 'delivery' && order.status !== 'pending' ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button 
                className="flex-1 h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm"
              >
                {order.status === 'preparing' && 'Avançar'}
                {order.status === 'ready' && 'Em entrega'}
                {order.status === 'out_for_delivery' && 'Finalizar'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[160px]">
              {order.status === 'preparing' && (
                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'ready')}>
                  ✅ Pronto para entrega
                </DropdownMenuItem>
              )}
              {order.status === 'ready' && (
                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}>
                  <Truck className="w-4 h-4 mr-2" />
                  Saiu para entrega
                </DropdownMenuItem>
              )}
              {order.status === 'out_for_delivery' && (
                <DropdownMenuItem 
                  onClick={() => updateOrderStatus(order.id, 'delivered')}
                  className="text-emerald-600"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Entrega concluída
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : showFinalizeButton && (order.order_type === 'counter' || order.order_type === 'takeaway') && !order.table_id && !order.tab_id ? (
          <Button 
            className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm"
            onClick={() => updateOrderStatus(order.id, 'delivered')}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Entregue
          </Button>
        ) : showFinalizeButton && (order.table_id || order.tab_id) && order.status === 'ready' && !showCloseButton ? (
          <Button 
            className="flex-1 h-9 bg-violet-500 hover:bg-violet-600 text-white font-semibold text-sm"
            onClick={() => updateOrderStatus(order.id, 'served')}
          >
            Marcar servido
          </Button>
        ) : null}
      </div>
    </div>
  );
}
