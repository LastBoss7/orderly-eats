import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Check, 
  X, 
  ChefHat, 
  Package, 
  Truck, 
  Clock, 
  MapPin, 
  Phone,
  User,
  Calendar,
  Navigation,
  Printer
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import logoIfood from '@/assets/logo-ifood.png';
import { usePrintToElectron } from '@/hooks/usePrintToElectron';
import { useAuth } from '@/lib/auth';

interface IFoodOrderCardProps {
  order: {
    id: string;
    ifood_order_id: string;
    ifood_display_id: string | null;
    order_data: unknown;
    status: string;
    expires_at: string | null;
    order_timing: string | null;
    order_type: string | null;
    delivered_by: string | null;
    driver_name: string | null;
    driver_phone: string | null;
    pickup_code: string | null;
    tracking_available: boolean | null;
    scheduled_to: string | null;
    preparation_started_at: string | null;
    created_at: string;
  };
  onAccept: () => void;
  onReject: () => void;
  onStartPreparation: () => void;
  onMarkReady: () => void;
  onDispatch: () => void;
  onCancel: () => void;
  onTrack?: () => void;
  isLoading?: boolean;
}

export function IFoodOrderCard({
  order,
  onAccept,
  onReject,
  onStartPreparation,
  onMarkReady,
  onDispatch,
  onCancel,
  onTrack,
  isLoading = false,
}: IFoodOrderCardProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [expired, setExpired] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const { restaurant } = useAuth();
  const { printIFoodOrder } = usePrintToElectron();

  // Parse order data - extended for printing
  const orderData = useMemo(() => {
    const data = order.order_data as Record<string, unknown>;
    const customer = (data?.customer || {}) as { 
      name?: string; 
      phone?: { number?: string; localizer?: string } | string;
      documentNumber?: string;
    };
    const delivery = (data?.delivery || {}) as { 
      deliveryAddress?: Record<string, string>;
      pickupCode?: string;
    };
    const total = (data?.total || {}) as { 
      orderAmount?: number; 
      deliveryFee?: number;
      subTotal?: number;
      benefits?: number;
    };
    const items = (data?.items || []) as Array<{ 
      name?: string; 
      quantity?: number; 
      unitPrice?: number;
      totalPrice?: number;
      options?: Array<{ name?: string; quantity?: number; unitPrice?: number }>;
      observations?: string;
    }>;
    const payments = (data?.payments || {}) as {
      methods?: Array<{ method?: string; value?: number; prepaid?: boolean }>;
    };

    return {
      customerName: customer.name || 'Cliente iFood',
      customerPhone: typeof customer.phone === 'object' ? customer.phone?.number : customer.phone,
      localizer: typeof customer.phone === 'object' ? customer.phone?.localizer : null,
      address: delivery.deliveryAddress 
        ? `${delivery.deliveryAddress.streetName || ''}, ${delivery.deliveryAddress.streetNumber || ''}`
        : null,
      neighborhood: delivery.deliveryAddress?.neighborhood,
      deliveryAddress: delivery.deliveryAddress,
      total: total.orderAmount || 0,
      deliveryFee: total.deliveryFee || 0,
      subTotal: total.subTotal || 0,
      benefits: total.benefits || 0,
      items,
      payments: payments.methods || [],
    };
  }, [order.order_data]);

  // Handle print
  const handlePrint = async () => {
    if (!restaurant?.id) return;
    
    setIsPrinting(true);
    try {
      await printIFoodOrder({
        ifoodOrderId: order.ifood_order_id,
        displayId: order.ifood_display_id || order.ifood_order_id.slice(-6),
        pickupCode: order.pickup_code,
        localizer: orderData.localizer,
        orderTiming: order.order_timing || 'IMMEDIATE',
        orderType: order.order_type || 'DELIVERY',
        deliveredBy: order.delivered_by || 'IFOOD',
        scheduledTo: order.scheduled_to,
        customer: {
          name: orderData.customerName,
          phone: orderData.customerPhone,
        },
        delivery: orderData.deliveryAddress ? {
          streetName: orderData.deliveryAddress.streetName,
          streetNumber: orderData.deliveryAddress.streetNumber,
          neighborhood: orderData.deliveryAddress.neighborhood,
          complement: orderData.deliveryAddress.complement,
          reference: orderData.deliveryAddress.reference,
          city: orderData.deliveryAddress.city,
          state: orderData.deliveryAddress.state,
        } : undefined,
        items: orderData.items.map(item => ({
          name: item.name || 'Item',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice,
          options: item.options?.map(opt => ({
            name: opt.name || '',
            quantity: opt.quantity || 1,
            unitPrice: opt.unitPrice || 0,
          })),
          observations: item.observations,
        })),
        total: {
          subTotal: orderData.subTotal || orderData.total - orderData.deliveryFee,
          deliveryFee: orderData.deliveryFee,
          benefits: orderData.benefits,
          orderAmount: orderData.total,
        },
        payments: orderData.payments.map(pay => ({
          method: pay.method || 'UNKNOWN',
          value: pay.value || 0,
          prepaid: pay.prepaid || false,
        })),
      });
    } finally {
      setIsPrinting(false);
    }
  };

  // Timer for pending orders (8 minutes)
  useEffect(() => {
    if (order.status !== 'pending' || !order.expires_at) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(order.expires_at!).getTime();
      const diff = Math.max(0, expires - now);
      
      setTimeLeft(diff);
      setExpired(diff <= 0);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order.status, order.expires_at]);

  const timerMinutes = Math.floor(timeLeft / 60000);
  const timerSeconds = Math.floor((timeLeft % 60000) / 1000);
  const timerProgress = order.expires_at 
    ? (timeLeft / (8 * 60 * 1000)) * 100 
    : 100;

  const getStatusColor = () => {
    switch (order.status) {
      case 'pending': return expired ? 'bg-destructive' : 'bg-orange-500';
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-yellow-500';
      case 'ready': return 'bg-green-500';
      case 'dispatched': return 'bg-purple-500';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = () => {
    switch (order.status) {
      case 'pending': return expired ? 'Expirado' : 'Aguardando';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Pronto';
      case 'dispatched': return 'Despachado';
      case 'cancellation_requested': return 'Cancelando...';
      default: return order.status;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className={cn(
      "relative overflow-hidden border-2 transition-all",
      order.status === 'pending' && !expired && "border-orange-500 shadow-orange-500/20 shadow-lg animate-pulse",
      order.status === 'pending' && expired && "border-destructive",
      order.status === 'confirmed' && "border-blue-500",
      order.status === 'preparing' && "border-yellow-500",
      order.status === 'ready' && "border-green-500",
    )}>
      {/* iFood Logo Badge */}
      <div className="absolute top-2 right-2 z-10">
        <img src={logoIfood} alt="iFood" className="h-6 w-auto" />
      </div>

      {/* Timer bar for pending orders */}
      {order.status === 'pending' && !expired && (
        <div className="absolute top-0 left-0 right-0">
          <Progress 
            value={timerProgress} 
            className="h-1 rounded-none"
            style={{ 
              background: 'hsl(var(--muted))',
            }}
          />
        </div>
      )}

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-white", getStatusColor())}>
              {getStatusLabel()}
            </Badge>
            
            {order.order_timing === 'SCHEDULED' && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                Agendado
              </Badge>
            )}
            
            {order.order_type === 'TAKEOUT' && (
              <Badge variant="secondary">Retirada</Badge>
            )}
          </div>
          
          <span className="text-lg font-bold text-primary">
            #{order.ifood_display_id || order.ifood_order_id.slice(-6)}
          </span>
        </div>

        {/* Timer display */}
        {order.status === 'pending' && !expired && (
          <div className="flex items-center gap-2 mt-2 text-orange-600 dark:text-orange-400">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Aceitar em: {timerMinutes}:{timerSeconds.toString().padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Scheduled time */}
        {order.scheduled_to && (
          <div className="flex items-center gap-2 mt-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">
              Agendado para: {new Date(order.scheduled_to).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Customer Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{orderData.customerName}</span>
          </div>
          
          {orderData.customerPhone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{orderData.customerPhone}</span>
            </div>
          )}
          
          {orderData.address && order.order_type !== 'TAKEOUT' && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{orderData.address} - {orderData.neighborhood}</span>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-muted/50 rounded-lg p-2 max-h-32 overflow-y-auto">
          {orderData.items.slice(0, 5).map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-0.5">
              <span>{item.quantity}x {item.name}</span>
              <span className="text-muted-foreground">{formatCurrency(item.unitPrice || 0)}</span>
            </div>
          ))}
          {orderData.items.length > 5 && (
            <div className="text-xs text-muted-foreground pt-1">
              +{orderData.items.length - 5} itens...
            </div>
          )}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center font-semibold border-t pt-2">
          <span>Total</span>
          <span className="text-lg text-primary">{formatCurrency(orderData.total)}</span>
        </div>

        {/* Driver Info */}
        {order.driver_name && (
          <div className="flex items-center gap-2 text-sm bg-purple-500/10 p-2 rounded-lg">
            <Truck className="h-4 w-4 text-purple-500" />
            <span className="font-medium">{order.driver_name}</span>
            {order.driver_phone && <span className="text-muted-foreground">• {order.driver_phone}</span>}
          </div>
        )}

        {/* Pickup Code */}
        {order.pickup_code && order.status !== 'pending' && (
          <div className="bg-green-500/10 p-2 rounded-lg text-center">
            <span className="text-xs text-muted-foreground">Código de coleta</span>
            <p className="text-2xl font-bold text-green-600">{order.pickup_code}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          {order.status === 'pending' && !expired && (
            <>
              <Button 
                onClick={onAccept} 
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Aceitar
              </Button>
              <Button 
                onClick={onReject} 
                disabled={isLoading}
                variant="destructive"
                className="flex-1"
              >
                <X className="h-4 w-4 mr-1" />
                Recusar
              </Button>
            </>
          )}

          {order.status === 'confirmed' && (
            <>
              <Button 
                onClick={onStartPreparation} 
                disabled={isLoading}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
              >
                <ChefHat className="h-4 w-4 mr-1" />
                Iniciar Preparo
              </Button>
              <Button 
                onClick={onCancel} 
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                Cancelar
              </Button>
            </>
          )}

          {order.status === 'preparing' && (
            <>
              <Button 
                onClick={onMarkReady} 
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Package className="h-4 w-4 mr-1" />
                Pronto
              </Button>
              <Button 
                onClick={onCancel} 
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                Cancelar
              </Button>
            </>
          )}

          {order.status === 'ready' && order.delivered_by === 'MERCHANT' && (
            <Button 
              onClick={onDispatch} 
              disabled={isLoading}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Truck className="h-4 w-4 mr-1" />
              Despachar
            </Button>
          )}

          {order.tracking_available && onTrack && (
            <Button 
              onClick={onTrack} 
              variant="outline"
              size="sm"
            >
              <Navigation className="h-4 w-4 mr-1" />
              Rastrear
            </Button>
          )}

          {/* Print button - show for all non-pending orders */}
          {order.status !== 'pending' && (
            <Button 
              onClick={handlePrint} 
              disabled={isPrinting}
              variant="outline"
              size="sm"
            >
              <Printer className="h-4 w-4 mr-1" />
              {isPrinting ? 'Imprimindo...' : 'Imprimir'}
            </Button>
          )}
        </div>

        {/* Created time */}
        <div className="text-xs text-muted-foreground text-center pt-1">
          Recebido {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ptBR })}
        </div>
      </CardContent>
    </Card>
  );
}
