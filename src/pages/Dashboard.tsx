import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { usePrintSettings } from '@/hooks/usePrintSettings';
import { NewOrderModal } from '@/components/dashboard/NewOrderModal';
import { EditPrepTimeModal } from '@/components/dashboard/EditPrepTimeModal';
import { PrintSettingsModal } from '@/components/dashboard/PrintSettingsModal';
import { MoveToTableModal } from '@/components/dashboard/MoveToTableModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { toast } from 'sonner';
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
  X,
  Phone,
  User,
  Bike,
  Package,
  Trash2,
  CheckCircle,
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
  delivery_address: string | null;
  delivery_phone: string | null;
  delivery_fee: number | null;
  created_by: string | null;
  order_items?: {
    id: string;
    product_name: string;
    quantity: number;
    product_price: number;
    notes: string | null;
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
  const [showPrintSettingsModal, setShowPrintSettingsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showMoveToTableModal, setShowMoveToTableModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [prepTimes, setPrepTimes] = useState<PrepTimeSettings>({
    counter_min: 10,
    counter_max: 50,
    delivery_min: 25,
    delivery_max: 80,
  });

  // Print settings hook
  const { settings: printSettings, updateSettings: updatePrintSettings, shouldAutoPrint } = usePrintSettings();
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

  // Auto-accept orders: automatically move pending orders to preparing
  useEffect(() => {
    if (!autoAccept || !restaurant?.id) return;

    const autoAcceptOrders = async () => {
      const pendingOrders = orders.filter(o => o.status === 'pending');
      
      for (const order of pendingOrders) {
        await supabase
          .from('orders')
          .update({ status: 'preparing' })
          .eq('id', order.id);
      }
      
      if (pendingOrders.length > 0) {
        fetchOrders();
      }
    };

    // Run immediately when orders change
    autoAcceptOrders();
  }, [autoAccept, orders.filter(o => o.status === 'pending').length, restaurant?.id]);

  const fetchOrders = async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('restaurant_id', restaurant.id)
        .in('status', ['pending', 'preparing', 'ready', 'delivered'])
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
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

  // Filter orders by status (exclude cancelled)
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  const updateOrderStatus = async (orderId: string, status: string) => {
    const order = orders.find(o => o.id === orderId);
    
    await supabase.from('orders').update({ status }).eq('id', orderId);
    
    // If finalizing order and it's a table order, update table status to available
    if (status === 'delivered' && order?.table_id) {
      await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', order.table_id);
    }
    
    fetchOrders();
    toast.success(`Pedido ${status === 'delivered' ? 'finalizado' : 'atualizado'} com sucesso!`);
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;

    try {
      // Update order status to cancelled
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderToCancel.id);

      // If it's a table order, set table back to available
      if (orderToCancel.table_id) {
        await supabase
          .from('tables')
          .update({ status: 'available' })
          .eq('id', orderToCancel.table_id);
      }

      toast.success('Pedido cancelado com sucesso!');
      setShowCancelDialog(false);
      setOrderToCancel(null);
      setShowOrderDetailModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      toast.error('Erro ao cancelar pedido');
    }
  };

  const handleOpenOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetailModal(true);
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
        className={`order-card cursor-pointer ${delayed && order.status !== 'delivered' ? 'ring-2 ring-destructive animate-pulse' : ''} ${isDragging ? 'shadow-xl z-50' : ''}`}
        onClick={() => handleOpenOrderDetail(order)}
      >
        {/* Drag Handle */}
        <div 
          {...listeners} 
          {...attributes}
          className="absolute top-2 right-2 p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Header */}
        <div className="order-card-header pr-8">
          <div className="order-number">
            {getOrderTypeIcon(order.order_type)}
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
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              {order.customer_name || 'Cliente não identificado'}
            </span>
            <span className="font-semibold">{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Table or delivery info */}
        {tableNumber && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UtensilsCrossed className="w-4 h-4" />
            Mesa {tableNumber}
          </div>
        )}

        {/* Order type badge */}
        {order.order_type && order.order_type !== 'table' && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {getOrderTypeIcon(order.order_type)}
              <span className="ml-1">{getOrderTypeLabel(order.order_type)}</span>
            </Badge>
          </div>
        )}

        {/* Items preview */}
        {order.order_items && order.order_items.length > 0 && (
          <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
            {order.order_items.slice(0, 2).map((item, idx) => (
              <div key={item.id} className="truncate">
                {item.quantity}x {item.product_name}
              </div>
            ))}
            {order.order_items.length > 2 && (
              <div className="text-primary">+{order.order_items.length - 2} mais itens</div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {showAdvanceButton && (
          <Button 
            variant="outline" 
            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground mt-2"
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
          <Button 
            variant="outline" 
            className="w-full border-green-600 text-green-600 hover:bg-green-600 hover:text-white mt-2"
            onClick={(e) => {
              e.stopPropagation();
              updateOrderStatus(order.id, 'delivered');
            }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Finalizar pedido
          </Button>
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
            {getOrderTypeIcon(order.order_type)}
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

  // Finalize all ready orders
  const handleFinalizeAllReady = async () => {
    for (const order of readyOrders) {
      await updateOrderStatus(order.id, 'delivered');
    }
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
                <Bike className="w-4 h-4" />
              </button>
              <button 
                className={`filter-tab ${filter === 'table' ? 'active' : ''}`}
                onClick={() => setFilter('table')}
              >
                <UtensilsCrossed className="w-4 h-4" />
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
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowPrintSettingsModal(true)}
              title="Configurações de impressão"
            >
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
                    <p className="text-sm">
                      {autoAccept 
                        ? 'Todos os pedidos são aceitos automaticamente' 
                        : 'Nenhum pedido em análise'}
                    </p>
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
                    {readyOrders.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-7 text-xs"
                        onClick={handleFinalizeAllReady}
                      >
                        Finalizar Todos
                      </Button>
                    )}
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

        {/* Order Detail Modal */}
        <Dialog open={showOrderDetailModal} onOpenChange={setShowOrderDetailModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedOrder && getOrderTypeIcon(selectedOrder.order_type)}
                Pedido #{selectedOrder?.id.slice(0, 4).toUpperCase()}
              </DialogTitle>
              <DialogDescription>
                {selectedOrder && formatDateTime(selectedOrder.created_at)}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4">
                {/* Order Type Badge */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {getOrderTypeLabel(selectedOrder.order_type)}
                  </Badge>
                  <Badge className={
                    selectedOrder.status === 'ready' ? 'bg-green-500' :
                    selectedOrder.status === 'preparing' ? 'bg-orange-500' : 
                    selectedOrder.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                  }>
                    {selectedOrder.status === 'pending' && 'Em análise'}
                    {selectedOrder.status === 'preparing' && 'Em produção'}
                    {selectedOrder.status === 'ready' && 'Pronto'}
                    {selectedOrder.status === 'delivered' && 'Finalizado'}
                  </Badge>
                </div>

                {/* Customer Info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">Dados do Cliente</h4>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedOrder.customer_name || 'Cliente não identificado'}</span>
                  </div>
                  {selectedOrder.delivery_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedOrder.delivery_phone}</span>
                    </div>
                  )}
                  {getTableNumber(selectedOrder.table_id) && (
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
                      <span>Mesa {getTableNumber(selectedOrder.table_id)}</span>
                    </div>
                  )}
                  {selectedOrder.delivery_address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{selectedOrder.delivery_address}</span>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground">Itens do Pedido</h4>
                  <div className="border rounded-lg divide-y">
                    {selectedOrder.order_items?.map((item) => (
                      <div key={item.id} className="p-3 flex justify-between">
                        <div>
                          <span className="font-medium">{item.quantity}x </span>
                          <span>{item.product_name}</span>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground">Obs: {item.notes}</p>
                          )}
                        </div>
                        <span className="font-medium">{formatCurrency(item.product_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Notes */}
                {selectedOrder.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Observações:</strong> {selectedOrder.notes}
                    </p>
                  </div>
                )}

                {/* Totals */}
                <div className="border-t pt-4 space-y-1">
                  {selectedOrder.delivery_fee && selectedOrder.delivery_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de entrega</span>
                      <span>{formatCurrency(selectedOrder.delivery_fee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button
                variant="destructive"
                onClick={() => {
                  setOrderToCancel(selectedOrder);
                  setShowCancelDialog(true);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              {selectedOrder?.order_type === 'counter' && !selectedOrder?.table_id && (
                <Button
                  variant="outline"
                  onClick={() => setShowMoveToTableModal(true)}
                >
                  <UtensilsCrossed className="w-4 h-4 mr-2" />
                  Mover para Mesa
                </Button>
              )}
              <Button onClick={() => setShowOrderDetailModal(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Order Confirmation */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Pedido</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja cancelar o pedido #{orderToCancel?.id.slice(0, 4).toUpperCase()}? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Não, manter pedido</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCancelOrder}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Sim, cancelar pedido
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* New Order Modal */}
        <NewOrderModal
          open={showNewOrderModal}
          onOpenChange={setShowNewOrderModal}
          onOrderCreated={fetchOrders}
          shouldAutoPrint={shouldAutoPrint}
        />

        {/* Edit Prep Time Modal */}
        <EditPrepTimeModal
          open={showPrepTimeModal}
          onOpenChange={setShowPrepTimeModal}
          initialValues={prepTimes}
          onSave={setPrepTimes}
        />

        {/* Print Settings Modal */}
        <PrintSettingsModal
          open={showPrintSettingsModal}
          onOpenChange={setShowPrintSettingsModal}
          settings={printSettings}
          onSave={updatePrintSettings}
        />

        {/* Move to Table Modal */}
        <MoveToTableModal
          open={showMoveToTableModal}
          onOpenChange={setShowMoveToTableModal}
          order={selectedOrder}
          onOrderMoved={() => {
            fetchOrders();
            setShowOrderDetailModal(false);
            setSelectedOrder(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
