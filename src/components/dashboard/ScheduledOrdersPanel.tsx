import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  Clock, 
  ChevronRight,
  User,
  UtensilsCrossed,
  Bike,
  Package,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { format, isToday, isTomorrow, isPast, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  product_price: number;
  notes: string | null;
}

interface ScheduledOrder {
  id: string;
  order_type: string | null;
  status: string | null;
  total: number | null;
  customer_name: string | null;
  scheduled_at: string;
  created_at: string;
  order_number: number | null;
  delivery_address: string | null;
  delivery_phone: string | null;
  table_id: string | null;
  tab_id: string | null;
  order_items?: OrderItem[];
}

interface ScheduledOrdersPanelProps {
  orders: ScheduledOrder[];
  onStartOrder: (orderId: string) => void;
  onOpenDetail: (order: ScheduledOrder) => void;
  formatCurrency: (value: number | null) => string;
  getTableNumber: (tableId: string | null) => number | null;
  getTabInfo: (tabId: string | null) => { number: number; customer_name: string | null } | null;
}

export function ScheduledOrdersPanel({
  orders,
  onStartOrder,
  onOpenDetail,
  formatCurrency,
  getTableNumber,
  getTabInfo,
}: ScheduledOrdersPanelProps) {
  const [, setTimerTick] = useState(0);

  // Update every minute to refresh "time until" display
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(t => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

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

  const getLocationInfo = (order: ScheduledOrder) => {
    if (order.table_id) {
      const tableNumber = getTableNumber(order.table_id);
      return tableNumber ? `Mesa ${tableNumber}` : null;
    }
    if (order.tab_id) {
      const tab = getTabInfo(order.tab_id);
      if (tab) {
        return tab.customer_name ? `Comanda ${tab.number} - ${tab.customer_name}` : `Comanda ${tab.number}`;
      }
    }
    return null;
  };

  const formatScheduledTime = (dateString: string) => {
    const date = new Date(dateString);
    const time = format(date, 'HH:mm', { locale: ptBR });
    
    if (isToday(date)) {
      return `Hoje às ${time}`;
    }
    if (isTomorrow(date)) {
      return `Amanhã às ${time}`;
    }
    return format(date, "dd/MM 'às' HH:mm", { locale: ptBR });
  };

  const getTimeUntil = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMins = differenceInMinutes(date, now);
    
    if (diffMins < 0) {
      return { text: 'Atrasado', isUrgent: true, isPast: true };
    }
    if (diffMins <= 15) {
      return { text: `${diffMins} min`, isUrgent: true, isPast: false };
    }
    if (diffMins <= 60) {
      return { text: `${diffMins} min`, isUrgent: false, isPast: false };
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return { text: `${hours}h${mins > 0 ? `${mins}m` : ''}`, isUrgent: false, isPast: false };
  };

  // Sort orders by scheduled_at
  const sortedOrders = [...orders].sort((a, b) => 
    new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  // Group orders by urgency
  const urgentOrders = sortedOrders.filter(o => {
    const timeInfo = getTimeUntil(o.scheduled_at);
    return timeInfo.isUrgent || timeInfo.isPast;
  });
  
  const upcomingOrders = sortedOrders.filter(o => {
    const timeInfo = getTimeUntil(o.scheduled_at);
    return !timeInfo.isUrgent && !timeInfo.isPast;
  });

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Calendar className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm font-medium">Nenhum pedido agendado</p>
        <p className="text-xs mt-1 opacity-70">Pedidos agendados aparecerão aqui</p>
      </div>
    );
  }

  const renderOrderCard = (order: ScheduledOrder) => {
    const timeInfo = getTimeUntil(order.scheduled_at);
    const locationInfo = getLocationInfo(order);

    return (
      <div
        key={order.id}
        className={`p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
          timeInfo.isPast 
            ? 'bg-destructive/5 border-destructive/30' 
            : timeInfo.isUrgent 
              ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-700/50' 
              : 'bg-card hover:border-primary/30'
        }`}
        onClick={() => onOpenDetail(order)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              timeInfo.isPast 
                ? 'bg-destructive/10 text-destructive' 
                : 'bg-muted'
            }`}>
              {getOrderTypeIcon(order.order_type)}
            </div>
            <div>
              <span className="font-bold text-sm">#{order.order_number}</span>
              {locationInfo && (
                <span className="text-xs text-muted-foreground ml-2">{locationInfo}</span>
              )}
            </div>
          </div>
          
          <Badge 
            variant={timeInfo.isPast ? 'destructive' : timeInfo.isUrgent ? 'default' : 'secondary'}
            className={`text-xs ${
              timeInfo.isUrgent && !timeInfo.isPast 
                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                : ''
            }`}
          >
            {timeInfo.isPast && <AlertTriangle className="w-3 h-3 mr-1" />}
            {timeInfo.text}
          </Badge>
        </div>

        {/* Customer & Schedule */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {order.customer_name || 'Não identificado'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatScheduledTime(order.scheduled_at)}
          </span>
        </div>

        {/* Items preview */}
        {order.order_items && order.order_items.length > 0 && (
          <div className="text-xs text-muted-foreground mb-3 truncate">
            {order.order_items.slice(0, 2).map(item => 
              `${item.quantity}x ${item.product_name}`
            ).join(', ')}
            {order.order_items.length > 2 && ` +${order.order_items.length - 2}`}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">{formatCurrency(order.total)}</span>
          
          <Button
            size="sm"
            variant={timeInfo.isPast ? 'destructive' : 'default'}
            className="h-7 text-xs gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onStartOrder(order.id);
            }}
          >
            <Play className="w-3 h-3" />
            Iniciar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-4 p-1">
        {/* Urgent orders */}
        {urgentOrders.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">
                Urgente ({urgentOrders.length})
              </span>
            </div>
            <div className="space-y-2">
              {urgentOrders.map(renderOrderCard)}
            </div>
          </div>
        )}

        {/* Upcoming orders */}
        {upcomingOrders.length > 0 && (
          <div>
            {urgentOrders.length > 0 && (
              <div className="flex items-center gap-2 mb-2 px-1 mt-4">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Próximos ({upcomingOrders.length})
                </span>
              </div>
            )}
            <div className="space-y-2">
              {upcomingOrders.map(renderOrderCard)}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
