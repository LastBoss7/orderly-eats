import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { 
  Clock,
  AlertTriangle,
  ChefHat,
  Check,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  Timer,
  Flame,
  Package,
} from 'lucide-react';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  notes: string | null;
}

interface Order {
  id: string;
  status: string | null;
  table_id: string | null;
  customer_name: string | null;
  created_at: string;
  notes: string | null;
  order_type: string | null;
  order_items?: OrderItem[];
}

interface Table {
  id: string;
  number: number;
}

export default function Kitchen() {
  const { restaurant } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const { soundEnabled, toggleSound } = useOrderNotifications(restaurant?.id);

  // Update current time every second for timer display
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (restaurant?.id) {
      fetchOrders();
      fetchTables();
    }
  }, [restaurant?.id]);

  // Subscribe to realtime order updates
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel('kitchen-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id]);

  const fetchOrders = async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .in('status', ['pending', 'preparing'])
        .order('created_at', { ascending: true });

      if (!error && data) {
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    const { data } = await supabase.from('tables').select('id, number');
    if (data) setTables(data);
  };

  const getTableNumber = (tableId: string | null) => {
    if (!tableId) return null;
    const table = tables.find(t => t.id === tableId);
    return table?.number;
  };

  const getElapsedTime = (createdAt: string) => {
    const created = new Date(createdAt);
    const diff = currentTime.getTime() - created.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { minutes, seconds, total: diff };
  };

  const formatElapsedTime = (createdAt: string) => {
    const { minutes, seconds } = getElapsedTime(createdAt);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const isUrgent = (createdAt: string) => {
    const { minutes } = getElapsedTime(createdAt);
    return minutes >= 15;
  };

  const isWarning = (createdAt: string) => {
    const { minutes } = getElapsedTime(createdAt);
    return minutes >= 10 && minutes < 15;
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    fetchOrders();
  };

  // Filter orders by status
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');

  const KDSCard = ({ order, isPreparing = false }: { order: Order; isPreparing?: boolean }) => {
    const tableNumber = getTableNumber(order.table_id);
    const urgent = isUrgent(order.created_at);
    const warning = isWarning(order.created_at);
    
    return (
      <div 
        className={`
          kds-card relative bg-card rounded-xl border-2 overflow-hidden transition-all
          ${urgent ? 'border-destructive animate-pulse shadow-lg shadow-destructive/20' : ''}
          ${warning && !urgent ? 'border-warning shadow-lg shadow-warning/20' : ''}
          ${!urgent && !warning ? 'border-border hover:border-primary/50' : ''}
        `}
      >
        {/* Header */}
        <div className={`
          px-4 py-3 flex items-center justify-between
          ${urgent ? 'bg-destructive text-destructive-foreground' : ''}
          ${warning && !urgent ? 'bg-warning text-warning-foreground' : ''}
          ${!urgent && !warning ? 'bg-muted' : ''}
        `}>
          <div className="flex items-center gap-3">
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg
              ${urgent ? 'bg-destructive-foreground/20' : ''}
              ${warning && !urgent ? 'bg-warning-foreground/20' : ''}
              ${!urgent && !warning ? 'bg-primary text-primary-foreground' : ''}
            `}>
              {tableNumber ? tableNumber : <Package className="w-5 h-5" />}
            </div>
            <div>
              <p className={`font-bold text-lg ${!urgent && !warning ? 'text-foreground' : ''}`}>
                {tableNumber ? `Mesa ${tableNumber}` : 'Balcão'}
              </p>
              <p className={`text-xs ${!urgent && !warning ? 'text-muted-foreground' : 'opacity-80'}`}>
                #{order.id.slice(0, 6).toUpperCase()}
              </p>
            </div>
          </div>
          
          <div className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full font-mono font-bold text-lg
            ${urgent ? 'bg-destructive-foreground/20' : ''}
            ${warning && !urgent ? 'bg-warning-foreground/20' : ''}
            ${!urgent && !warning ? 'bg-primary/10 text-primary' : ''}
          `}>
            <Timer className="w-4 h-4" />
            {formatElapsedTime(order.created_at)}
          </div>
        </div>

        {/* Urgent indicator */}
        {urgent && (
          <div className="bg-destructive/90 text-destructive-foreground text-center py-2 text-sm font-semibold flex items-center justify-center gap-2">
            <Flame className="w-4 h-4 animate-bounce" />
            PEDIDO ATRASADO - PRIORIDADE!
            <Flame className="w-4 h-4 animate-bounce" />
          </div>
        )}

        {/* Items list */}
        <div className="p-4 space-y-3">
          {order.order_items?.map((item, index) => (
            <div 
              key={item.id} 
              className={`
                flex items-start gap-3 pb-3
                ${index < (order.order_items?.length || 0) - 1 ? 'border-b border-border' : ''}
              `}
            >
              <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0
                ${urgent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}
              `}>
                {item.quantity}x
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{item.product_name}</p>
                {item.notes && (
                  <p className="text-sm text-warning font-medium mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {item.notes}
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Order notes */}
          {order.notes && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-sm">
              <p className="font-semibold text-warning flex items-center gap-1 mb-1">
                <AlertTriangle className="w-4 h-4" />
                Observação:
              </p>
              <p className="text-foreground">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-4 pt-0">
          {!isPreparing ? (
            <Button 
              className="w-full bg-warning hover:bg-warning/90 text-warning-foreground font-semibold h-12 text-base"
              onClick={() => updateOrderStatus(order.id, 'preparing')}
            >
              <ChefHat className="w-5 h-5 mr-2" />
              Iniciar Preparo
            </Button>
          ) : (
            <Button 
              className="w-full bg-success hover:bg-success/90 text-success-foreground font-semibold h-12 text-base"
              onClick={() => updateOrderStatus(order.id, 'ready')}
            >
              <Check className="w-5 h-5 mr-2" />
              Pronto para Entrega
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col bg-muted/30">
        {/* Top Bar */}
        <div className="bg-card border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <ChefHat className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Cozinha (KDS)</h1>
                  <p className="text-sm text-muted-foreground">
                    {orders.length} pedido{orders.length !== 1 ? 's' : ''} em andamento
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Status badges */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 px-3 py-1">
                  <Clock className="w-3 h-3 mr-1" />
                  Aguardando: {pendingOrders.length}
                </Badge>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 px-3 py-1">
                  <ChefHat className="w-3 h-3 mr-1" />
                  Preparando: {preparingOrders.length}
                </Badge>
              </div>

              {/* Sound toggle */}
              <Button 
                variant="outline" 
                size="icon"
                onClick={toggleSound}
                className={soundEnabled ? 'text-primary border-primary' : 'text-muted-foreground'}
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>

              {/* Current time */}
              <div className="text-right">
                <p className="text-2xl font-mono font-bold text-foreground">
                  {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* KDS Grid */}
        <div className="flex-1 overflow-auto p-4">
          {orders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <UtensilsCrossed className="w-24 h-24 mb-6 opacity-30" />
              <h2 className="text-2xl font-semibold mb-2">Nenhum pedido pendente</h2>
              <p className="text-lg">Aguardando novos pedidos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {/* Pending orders first, then preparing */}
              {pendingOrders.map(order => (
                <KDSCard key={order.id} order={order} />
              ))}
              {preparingOrders.map(order => (
                <KDSCard key={order.id} order={order} isPreparing />
              ))}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="bg-card border-t px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-warning" />
                <span className="text-muted-foreground">Aguardando preparo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Em preparo</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
                <span className="text-muted-foreground">Atrasado (+15 min)</span>
              </div>
            </div>
            <p className="text-muted-foreground">
              Atualização em tempo real ativada
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
