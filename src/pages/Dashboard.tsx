import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { 
  Search,
  Plus,
  Printer,
  Settings,
  Clock,
  AlertTriangle,
  ChefHat,
  ArrowRight,
  UtensilsCrossed,
  MapPin,
  Phone,
  CreditCard,
  Banknote,
  MessageCircle,
} from 'lucide-react';

interface Order {
  id: string;
  order_type: string | null;
  status: string | null;
  total: number | null;
  customer_name: string | null;
  table_id: string | null;
  created_at: string;
  notes: string | null;
  order_items?: {
    id: string;
    product_name: string;
    quantity: number;
    product_price: number;
  }[];
}

interface Table {
  id: string;
  number: number;
}

type FilterType = 'all' | 'delivery' | 'table' | 'scheduled';

export default function Dashboard() {
  const { restaurant } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoAccept, setAutoAccept] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    fetchOrders();
    fetchTables();
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
        .order('created_at', { ascending: false });

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

  const formatCurrency = (value: number | null) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isDelayed = (order: Order) => {
    const created = new Date(order.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - created.getTime()) / 1000 / 60;
    return diffMinutes > 30;
  };

  // Filter orders by status
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => ['ready', 'delivered'].includes(o.status || ''));

  const updateOrderStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    fetchOrders();
  };

  const OrderCard = ({ order, showAdvanceButton = false, showFinalizeButton = false }: { 
    order: Order; 
    showAdvanceButton?: boolean;
    showFinalizeButton?: boolean;
  }) => {
    const tableNumber = getTableNumber(order.table_id);
    const delayed = isDelayed(order);

    return (
      <div className="order-card">
        {/* Header */}
        <div className="order-card-header">
          <div className="order-number">
            <ChefHat className="w-5 h-5 text-muted-foreground" />
            <span>Pedido #{order.id.slice(0, 4).toUpperCase()}</span>
          </div>
          <div className="order-time">
            <Clock className="w-3 h-3" />
            {formatTime(order.created_at)}
          </div>
        </div>

        {/* Status bar for delayed */}
        {delayed && order.status !== 'delivered' && (
          <div className="order-status-bar delayed flex items-center justify-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            Pedido atrasado
          </div>
        )}

        {/* Customer info */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {order.customer_name || 'Não identificado'}
            </span>
            <span className="font-semibold">Total: {formatCurrency(order.total)}</span>
          </div>
          {!order.customer_name && (
            <p className="text-xs text-muted-foreground">Não registrado</p>
          )}
        </div>

        {/* Table info */}
        {tableNumber && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UtensilsCrossed className="w-4 h-4" />
            Mesa {tableNumber}
          </div>
        )}

        {/* Order type badge */}
        {order.order_type === 'delivery' && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            Retirada no local
          </div>
        )}

        {/* Action buttons */}
        {showAdvanceButton && (
          <Button 
            variant="outline" 
            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => updateOrderStatus(order.id, order.status === 'pending' ? 'preparing' : 'ready')}
          >
            Avançar pedido
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {showFinalizeButton && (
          <div className="flex gap-2">
            <Badge className="nfc-badge">NFC</Badge>
            <Button 
              variant="outline" 
              className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => updateOrderStatus(order.id, 'delivered')}
            >
              Finalizar pedido
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Top Bar */}
        <div className="bg-card border-b px-4 py-3">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            
            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-full">
              <button 
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                Todos
              </button>
              <button 
                className={`filter-tab ${filter === 'delivery' ? 'active' : ''}`}
                onClick={() => setFilter('delivery')}
              >
                <UtensilsCrossed className="w-4 h-4" />
              </button>
              <button 
                className={`filter-tab ${filter === 'table' ? 'active' : ''}`}
                onClick={() => setFilter('table')}
              >
                <ChefHat className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Busque por cliente ou número do pedido"
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            <Button className="top-action-btn">
              <Plus className="w-4 h-4" />
              Novo pedido
            </Button>
            <Button variant="ghost" size="icon">
              <Printer className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="h-full flex gap-4 kanban-scroll">
            {/* Column: Em análise */}
            <div className="w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden">
              <div className="kanban-header analysis">
                <span>Em análise</span>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {pendingOrders.length}
                </Badge>
              </div>
              
              {/* Auto accept toggle */}
              <div className="p-4 bg-white border-b">
                <div className="text-sm space-y-1">
                  <p><strong>Balcão:</strong> 10 a 50 min <span className="text-primary cursor-pointer">Editar</span></p>
                  <p><strong>Delivery:</strong> 25 a 80 min</p>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Switch checked={autoAccept} onCheckedChange={setAutoAccept} />
                  <span className="text-sm">Aceitar os pedidos automaticamente</span>
                </div>
              </div>

              {pendingOrders.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                  <div className="w-12 h-12 mb-3 opacity-50">↩</div>
                  <p className="text-sm">Todos os pedidos</p>
                  <p className="text-sm">são aceitos automaticamente</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {pendingOrders.map(order => (
                    <OrderCard key={order.id} order={order} showAdvanceButton />
                  ))}
                </div>
              )}
            </div>

            {/* Column: Em produção */}
            <div className="w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden">
              <div className="kanban-header production">
                <div className="flex items-center gap-2">
                  <span>Em produção</span>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <Badge variant="secondary" className="bg-white/20 text-white">
                  {preparingOrders.length}
                </Badge>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {preparingOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                    <ChefHat className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">Nenhum pedido em produção</p>
                  </div>
                ) : (
                  preparingOrders.map(order => (
                    <OrderCard key={order.id} order={order} showAdvanceButton />
                  ))
                )}
              </div>
            </div>

            {/* Column: Prontos para entrega */}
            <div className="w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden">
              <div className="kanban-header ready">
                <span>Prontos para entrega</span>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    Finalizar
                  </Button>
                  <Badge variant="secondary">
                    {readyOrders.length}
                  </Badge>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {readyOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                    <UtensilsCrossed className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">Nenhum pedido pronto</p>
                  </div>
                ) : (
                  readyOrders.map(order => (
                    <OrderCard key={order.id} order={order} showFinalizeButton />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
