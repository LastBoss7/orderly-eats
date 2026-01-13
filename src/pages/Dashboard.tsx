import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { NewOrderModal } from '@/components/dashboard/NewOrderModal';
import { EditPrepTimeModal } from '@/components/dashboard/EditPrepTimeModal';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
  Volume2,
  VolumeX,
  Bell,
  GripVertical,
} from 'lucide-react';

interface PrepTimeSettings {
  counter_min: number;
  counter_max: number;
  delivery_min: number;
  delivery_max: number;
}

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
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showPrepTimeModal, setShowPrepTimeModal] = useState(false);
  const [prepTimes, setPrepTimes] = useState<PrepTimeSettings>({
    counter_min: 10,
    counter_max: 50,
    delivery_min: 25,
    delivery_max: 80,
  });
  // Order notifications hook
  const { 
    notifications, 
    soundEnabled, 
    toggleSound,
    playNotificationSound 
  } = useOrderNotifications(restaurant?.id);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load prep times from database
  useEffect(() => {
    const fetchPrepTimes = async () => {
      if (!restaurant?.id) return;

      const { data } = await supabase
        .from('salon_settings')
        .select('counter_prep_min, counter_prep_max, delivery_prep_min, delivery_prep_max')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (data) {
        setPrepTimes({
          counter_min: data.counter_prep_min ?? 10,
          counter_max: data.counter_prep_max ?? 50,
          delivery_min: data.delivery_prep_min ?? 25,
          delivery_max: data.delivery_prep_max ?? 80,
        });
      }
    };

    fetchPrepTimes();
  }, [restaurant?.id]);

  useEffect(() => {
    fetchOrders();
    fetchTables();
  }, [restaurant?.id]);

  // Subscribe to realtime order updates
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          // Refresh orders when any change happens
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

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = orders.find(o => o.id === active.id);
    if (order) {
      setActiveOrder(order);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as string;

    // Find the order
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Map column IDs to status
    const statusMap: Record<string, string> = {
      'column-pending': 'pending',
      'column-preparing': 'preparing',
      'column-ready': 'ready',
    };

    const targetStatus = statusMap[newStatus];
    if (targetStatus && order.status !== targetStatus) {
      updateOrderStatus(orderId, targetStatus);
    }
  };

  // Droppable Column Component
  const DroppableColumn = ({ 
    id, 
    children, 
    className 
  }: { 
    id: string; 
    children: React.ReactNode; 
    className?: string;
  }) => {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
      <div 
        ref={setNodeRef} 
        className={`${className} transition-all duration-200 ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      >
        {children}
      </div>
    );
  };

  // Draggable Order Card Component
  const DraggableOrderCard = ({ 
    order, 
    showAdvanceButton = false, 
    showFinalizeButton = false 
  }: { 
    order: Order; 
    showAdvanceButton?: boolean;
    showFinalizeButton?: boolean;
  }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: order.id,
    });

    const style = {
      transform: CSS.Translate.toString(transform),
      opacity: isDragging ? 0.5 : 1,
    };

    const tableNumber = getTableNumber(order.table_id);
    const delayed = isDelayed(order);

    return (
      <div 
        ref={setNodeRef} 
        style={style}
        className={`order-card ${delayed && order.status !== 'delivered' ? 'ring-2 ring-destructive animate-pulse' : ''} ${isDragging ? 'shadow-xl z-50' : ''}`}
      >
        {/* Drag Handle */}
        <div 
          {...listeners} 
          {...attributes}
          className="absolute top-2 right-2 p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Header */}
        <div className="order-card-header pr-8">
          <div className="order-number">
            <ChefHat className="w-5 h-5 text-muted-foreground" />
            <span>Pedido #{order.id.slice(0, 4).toUpperCase()}</span>
          </div>
          <div className={`order-time ${delayed ? 'bg-destructive text-destructive-foreground' : ''}`}>
            <Clock className="w-3 h-3" />
            {formatTime(order.created_at)}
          </div>
        </div>

        {/* Status bar for delayed */}
        {delayed && order.status !== 'delivered' && (
          <div className="order-status-bar delayed flex items-center justify-center gap-2 animate-pulse">
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
            onClick={(e) => {
              e.stopPropagation();
              updateOrderStatus(order.id, order.status === 'pending' ? 'preparing' : 'ready');
            }}
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
              onClick={(e) => {
                e.stopPropagation();
                updateOrderStatus(order.id, 'delivered');
              }}
            >
              Finalizar pedido
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  // Overlay card for drag preview
  const OrderCardOverlay = ({ order }: { order: Order }) => {
    const tableNumber = getTableNumber(order.table_id);
    const delayed = isDelayed(order);

    return (
      <div className={`order-card shadow-2xl rotate-3 ${delayed && order.status !== 'delivered' ? 'ring-2 ring-destructive' : ''}`}>
        <div className="order-card-header">
          <div className="order-number">
            <ChefHat className="w-5 h-5 text-muted-foreground" />
            <span>Pedido #{order.id.slice(0, 4).toUpperCase()}</span>
          </div>
          <div className={`order-time ${delayed ? 'bg-destructive text-destructive-foreground' : ''}`}>
            <Clock className="w-3 h-3" />
            {formatTime(order.created_at)}
          </div>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {order.customer_name || 'Não identificado'}
            </span>
            <span className="font-semibold">Total: {formatCurrency(order.total)}</span>
          </div>
        </div>
        {tableNumber && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UtensilsCrossed className="w-4 h-4" />
            Mesa {tableNumber}
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
            <Button className="top-action-btn" onClick={() => setShowNewOrderModal(true)}>
              <Plus className="w-4 h-4" />
              Novo pedido
            </Button>
            
            {/* Sound toggle */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleSound}
              className={soundEnabled ? 'text-primary' : 'text-muted-foreground'}
              title={soundEnabled ? 'Som ativado' : 'Som desativado'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
            
            {/* Notifications indicator */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </Button>
            
            <Button variant="ghost" size="icon">
              <Printer className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Kanban Board with DnD */}
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-hidden p-4">
            <div className="h-full flex gap-4 kanban-scroll">
              {/* Column: Em análise */}
              <DroppableColumn 
                id="column-pending" 
                className="w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden"
              >
                <div className="kanban-header analysis">
                  <span>Em análise</span>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {pendingOrders.length}
                  </Badge>
                </div>
                
                {/* Auto accept toggle */}
                <div className="p-4 bg-white border-b">
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Balcão:</strong> {prepTimes.counter_min} a {prepTimes.counter_max} min{' '}
                      <span 
                        className="text-primary cursor-pointer hover:underline"
                        onClick={() => setShowPrepTimeModal(true)}
                      >
                        Editar
                      </span>
                    </p>
                    <p><strong>Delivery:</strong> {prepTimes.delivery_min} a {prepTimes.delivery_max} min</p>
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
                      <DraggableOrderCard key={order.id} order={order} showAdvanceButton />
                    ))}
                  </div>
                )}
              </DroppableColumn>

              {/* Column: Em produção */}
              <DroppableColumn 
                id="column-preparing" 
                className="w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden"
              >
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
                      <DraggableOrderCard key={order.id} order={order} showAdvanceButton />
                    ))
                  )}
                </div>
              </DroppableColumn>

              {/* Column: Prontos para entrega */}
              <DroppableColumn 
                id="column-ready" 
                className="w-80 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden"
              >
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
                      <DraggableOrderCard key={order.id} order={order} showFinalizeButton />
                    ))
                  )}
                </div>
              </DroppableColumn>
            </div>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeOrder ? <OrderCardOverlay order={activeOrder} /> : null}
          </DragOverlay>
        </DndContext>

        {/* New Order Modal */}
        <NewOrderModal
          open={showNewOrderModal}
          onOpenChange={setShowNewOrderModal}
          onOrderCreated={fetchOrders}
        />

        {/* Edit Prep Time Modal */}
        <EditPrepTimeModal
          open={showPrepTimeModal}
          onOpenChange={setShowPrepTimeModal}
          initialValues={prepTimes}
          onSave={setPrepTimes}
        />
      </div>
    </DashboardLayout>
  );
}
