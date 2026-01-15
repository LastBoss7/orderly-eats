import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import { usePrintSettings } from '@/hooks/usePrintSettings';
import { usePrintLogs } from '@/hooks/usePrintLogs';
import { useKeyboardShortcuts, SHORTCUT_DESCRIPTIONS } from '@/hooks/useKeyboardShortcuts';
import { NewOrderModal } from '@/components/dashboard/NewOrderModal';
import { EditPrepTimeModal } from '@/components/dashboard/EditPrepTimeModal';
import { PrintSettingsModal } from '@/components/dashboard/PrintSettingsModal';
import { MoveToTableModal } from '@/components/dashboard/MoveToTableModal';
import { StoreControlModal } from '@/components/dashboard/StoreControlModal';
import { PrintReceipt } from '@/components/PrintReceipt';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  Store,
  Power,
  PowerOff,
  Keyboard,
  ChevronDown,
  Truck,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  tab_id: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  delivery_address: string | null;
  delivery_phone: string | null;
  delivery_fee: number | null;
  created_by: string | null;
  order_number: number | null;
  print_count: number | null;
  printed_at: string | null;
  payment_method: string | null;
  driver_id: string | null;
  waiter_id: string | null;
  order_items?: {
    id: string;
    product_name: string;
    quantity: number;
    product_price: number;
    notes: string | null;
  }[];
}

interface Waiter {
  id: string;
  name: string;
}

interface Table {
  id: string;
  number: number;
}

interface Tab {
  id: string;
  number: number;
  customer_name: string | null;
}

interface DeliveryDriver {
  id: string;
  name: string;
  phone: string | null;
}

type FilterType = 'all' | 'delivery' | 'counter' | 'table' | 'tab';

export default function Dashboard() {
  const { restaurant } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoAccept, setAutoAccept] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [newOrderInitialType, setNewOrderInitialType] = useState<'counter' | 'table' | 'delivery' | 'takeaway' | undefined>(undefined);
  const [showPrepTimeModal, setShowPrepTimeModal] = useState(false);
  const [showPrintSettingsModal, setShowPrintSettingsModal] = useState(false);
  const [showStoreControlModal, setShowStoreControlModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetailModal, setShowOrderDetailModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showMoveToTableModal, setShowMoveToTableModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [isStoreOpen, setIsStoreOpen] = useState(false);
  const [prepTimes, setPrepTimes] = useState<PrepTimeSettings>({
    counter_min: 10,
    counter_max: 50,
    delivery_min: 25,
    delivery_max: 80,
  });

  // Keyboard shortcuts for quick order creation
  const handleNewOrderShortcut = useCallback((type?: 'counter' | 'table' | 'delivery' | 'takeaway') => {
    setNewOrderInitialType(type);
    setShowNewOrderModal(true);
  }, []);

  // Print settings hook
  const { settings: printSettings, updateSettings: updatePrintSettings, shouldAutoPrint } = usePrintSettings();
  // Print logs hook
  const { logPrint } = usePrintLogs();
  // Keyboard shortcuts hook
  useKeyboardShortcuts({
    onNewOrder: handleNewOrderShortcut,
    enabled: !showNewOrderModal && !showOrderDetailModal,
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

  // Load prep times and store status from database
  useEffect(() => {
    const fetchSettings = async () => {
      if (!restaurant?.id) return;

      const { data } = await supabase
        .from('salon_settings')
        .select('counter_prep_min, counter_prep_max, delivery_prep_min, delivery_prep_max, is_open')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (data) {
        setPrepTimes({
          counter_min: data.counter_prep_min ?? 10,
          counter_max: data.counter_prep_max ?? 50,
          delivery_min: data.delivery_prep_min ?? 25,
          delivery_max: data.delivery_prep_max ?? 80,
        });
        setIsStoreOpen(data.is_open ?? false);
      }
    };

    fetchSettings();
  }, [restaurant?.id]);

  useEffect(() => {
    fetchOrders();
    fetchTables();
    fetchTabs();
    fetchWaiters();
    fetchDrivers();
  }, [restaurant?.id]);

  // Timer update every minute
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(t => t + 1);
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

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
        .in('status', ['pending', 'preparing', 'ready', 'out_for_delivery', 'delivered'])
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

  const fetchTabs = async () => {
    if (!restaurant?.id) return;
    const { data } = await supabase
      .from('tabs')
      .select('id, number, customer_name')
      .eq('restaurant_id', restaurant.id);
    if (data) setTabs(data);
  };

  const fetchWaiters = async () => {
    if (!restaurant?.id) return;
    const { data } = await supabase
      .from('waiters')
      .select('id, name')
      .eq('restaurant_id', restaurant.id);
    if (data) setWaiters(data);
  };

  const fetchDrivers = async () => {
    if (!restaurant?.id) return;
    const { data } = await supabase
      .from('delivery_drivers')
      .select('id, name, phone')
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'active');
    if (data) setDrivers(data);
  };

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return null;
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name;
  };

  const getDriverPhone = (driverId: string | null) => {
    if (!driverId) return null;
    const driver = drivers.find(d => d.id === driverId);
    return driver?.phone;
  };

  const formatWhatsAppLink = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${phoneWithCountry}`;
  };

  const getTableNumber = (tableId: string | null) => {
    if (!tableId) return null;
    const table = tables.find(t => t.id === tableId);
    return table?.number;
  };

  const getTabInfo = (tabId: string | null) => {
    if (!tabId) return null;
    const tab = tabs.find(t => t.id === tabId);
    return tab;
  };

  const getOrderLocationInfo = (order: Order): { label: string; type: 'table' | 'tab' } | null => {
    if (order.table_id) {
      const tableNumber = getTableNumber(order.table_id);
      return tableNumber ? { label: `Mesa ${tableNumber}`, type: 'table' } : null;
    }
    if (order.tab_id) {
      const tab = getTabInfo(order.tab_id);
      if (tab) {
        const label = tab.customer_name ? `Comanda ${tab.number} - ${tab.customer_name}` : `Comanda ${tab.number}`;
        return { label, type: 'tab' };
      }
    }
    return null;
  };

  const getWaiterName = (waiterId: string | null) => {
    if (!waiterId) return null;
    const waiter = waiters.find(w => w.id === waiterId);
    return waiter?.name || null;
  };

  const getOrderPrepTime = (orderType: string | null): { min: number; max: number } => {
    if (orderType === 'delivery') {
      return { min: prepTimes.delivery_min, max: prepTimes.delivery_max };
    }
    // counter, table, takeaway all use counter prep time
    return { min: prepTimes.counter_min, max: prepTimes.counter_max };
  };

  const getOrderTimer = (order: Order): { elapsed: number; limit: number; isOverdue: boolean; percentage: number } | null => {
    // Only show timer for orders that are being prepared
    if (order.status !== 'preparing' && order.status !== 'ready' && order.status !== 'out_for_delivery') {
      return null;
    }
    
    // Use updated_at as the time when status changed to preparing
    const startTime = new Date(order.updated_at);
    const now = new Date();
    const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60);
    
    const { max } = getOrderPrepTime(order.order_type);
    const percentage = Math.min((elapsedMinutes / max) * 100, 100);
    
    return {
      elapsed: elapsedMinutes,
      limit: max,
      isOverdue: elapsedMinutes > max,
      percentage,
    };
  };

  const formatElapsedTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? `${mins}min` : ''}`;
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

  const getOrderDisplayNumber = (order: Order) => {
    if (order.order_number) {
      return `#${order.order_number}`;
    }
    return `#${order.id.slice(0, 4).toUpperCase()}`;
  };

  const isDelayed = (order: Order) => {
    const created = new Date(order.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - created.getTime()) / 1000 / 60;
    return diffMinutes > 30;
  };

  // Filter orders by type first
  const filterOrdersByType = (orderList: Order[]) => {
    if (filter === 'all') return orderList;
    if (filter === 'delivery') return orderList.filter(o => o.order_type === 'delivery');
    if (filter === 'counter') return orderList.filter(o => o.order_type === 'counter' || o.order_type === 'takeaway');
    if (filter === 'table') return orderList.filter(o => o.table_id !== null);
    if (filter === 'tab') return orderList.filter(o => o.tab_id !== null);
    return orderList;
  };

  // Filter orders by status (exclude cancelled) and then by type
  const allPendingOrders = orders.filter(o => o.status === 'pending');
  const allPreparingOrders = orders.filter(o => o.status === 'preparing');
  const allReadyOrders = orders.filter(o => o.status === 'ready' || o.status === 'out_for_delivery');

  const pendingOrders = filterOrdersByType(allPendingOrders);
  const preparingOrders = filterOrdersByType(allPreparingOrders);
  const readyOrders = filterOrdersByType(allReadyOrders);

  // Count orders by filter type for badges
  const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready', 'out_for_delivery'].includes(o.status || ''));
  const orderCounts = {
    all: activeOrders.length,
    table: activeOrders.filter(o => o.table_id !== null).length,
    tab: activeOrders.filter(o => o.tab_id !== null).length,
    delivery: activeOrders.filter(o => o.order_type === 'delivery').length,
    counter: activeOrders.filter(o => o.order_type === 'counter' || o.order_type === 'takeaway').length,
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    console.log('Updating order status:', { orderId, status });
    
    const updateData: { status: string; ready_at?: string; updated_at: string } = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    // Record ready_at timestamp when order becomes ready
    if (status === 'ready') {
      updateData.ready_at = new Date().toISOString();
    }
    
    const { error, data } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select();
    
    console.log('Supabase response:', { error, data });
    
    if (error) {
      console.error('Error updating order:', error);
      toast.error('Erro ao atualizar pedido');
      return;
    }
    
    // Update local orders state immediately for faster UI
    setOrders(prev => {
      const updated = prev.map(o => 
        o.id === orderId ? { ...o, status, updated_at: updateData.updated_at } : o
      );
      console.log('Updated orders state:', updated.find(o => o.id === orderId));
      return updated;
    });
    
    // Update selectedOrder if it's the one being updated
    setSelectedOrder(prev => {
      if (prev?.id === orderId) {
        const updated = { ...prev, status, updated_at: updateData.updated_at };
        console.log('Updated selectedOrder:', updated);
        return updated;
      }
      return prev;
    });
    
    // Note: "delivered" status just removes the order from dashboard display
    // It does NOT close the table - that happens when the bill is paid via "Fechar Conta"
    
    toast.success(`Pedido ${status === 'delivered' ? 'marcado como entregue' : 'atualizado'} com sucesso!`);
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

  const updateOrderDriver = async (orderId: string, driverId: string | null, order?: Order) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ driver_id: driverId })
        .eq('id', orderId);

      if (error) throw error;
      toast.success('Motoboy atribuído com sucesso!');
      fetchOrders();

      // Send WhatsApp message if driver is assigned and has phone
      if (driverId && order) {
        const driverPhone = getDriverPhone(driverId);
        if (driverPhone) {
          const paymentLabel = getPaymentMethodLabel(order.payment_method);
          const items = order.order_items?.map(item => 
            `${item.quantity}x ${item.product_name}`
          ).join(', ') || 'Sem itens';
          
          const message = `🛵 *NOVO PEDIDO PARA ENTREGA*

📋 *Pedido #${order.order_number || 'S/N'}*

👤 *Cliente:* ${order.customer_name || 'Não informado'}
📞 *Telefone:* ${order.delivery_phone || 'Não informado'}

📍 *Endereço:*
${order.delivery_address || 'Não informado'}

🍽️ *Itens:*
${items}

💰 *Total:* ${formatCurrency(order.total || 0)}
${order.delivery_fee ? `🚚 *Taxa entrega:* ${formatCurrency(order.delivery_fee)}` : ''}

💳 *Pagamento:* ${paymentLabel}
${order.payment_method === 'cash' && order.notes?.includes('Troco') ? `💵 ${order.notes}` : ''}

${order.notes && !order.notes.includes('Troco') ? `📝 *Obs:* ${order.notes}` : ''}`;

          const whatsappUrl = formatWhatsAppLink(driverPhone) + `?text=${encodeURIComponent(message)}`;
          window.open(whatsappUrl, '_blank');
        }
      }
    } catch (error) {
      console.error('Error updating driver:', error);
      toast.error('Erro ao atribuir motoboy');
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    const labels: Record<string, string> = {
      'cash': 'Dinheiro',
      'credit': 'Cartão Crédito',
      'debit': 'Cartão Débito',
      'pix': 'PIX',
    };
    return labels[method || ''] || method || 'Não informado';
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

    const locationInfo = getOrderLocationInfo(order);
    const delayed = isDelayed(order);
    const waiterName = getWaiterName(order.waiter_id);
    const timer = getOrderTimer(order);

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
            <span>Pedido {getOrderDisplayNumber(order)}</span>
          </div>
          <div className={`order-time ${delayed ? 'bg-destructive text-destructive-foreground' : ''}`}>
            <Clock className="w-3 h-3" />
            {formatTime(order.created_at)}
          </div>
        </div>

        {/* Timer Progress Bar */}
        {timer && order.status === 'preparing' && (
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className={`font-medium ${timer.isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                ⏱ {formatElapsedTime(timer.elapsed)} / {timer.limit}min
              </span>
              {timer.isOverdue && (
                <span className="text-destructive font-semibold animate-pulse">
                  +{formatElapsedTime(timer.elapsed - timer.limit)}
                </span>
              )}
            </div>
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

        {/* Status bar for delayed */}
        {delayed && order.status !== 'delivered' && (
          <div className="order-status-bar delayed flex items-center justify-center gap-2 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Pedido atrasado
          </div>
        )}

        {/* Customer and Waiter info */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              {order.customer_name || 'Cliente não identificado'}
            </span>
            <span className="font-semibold">{formatCurrency(order.total)}</span>
          </div>
          {waiterName && (
            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <ChefHat className="w-3 h-3" />
              <span>Garçom: {waiterName}</span>
            </div>
          )}
        </div>

        {/* Table or Tab info */}
        {locationInfo && (
          <div className={`flex items-center gap-2 text-sm font-medium px-2 py-1 rounded ${
            locationInfo.type === 'table' 
              ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40' 
              : 'text-violet-700 bg-violet-100 dark:text-violet-300 dark:bg-violet-900/40'
          }`}>
            <UtensilsCrossed className="w-4 h-4" />
            {locationInfo.label}
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

        {/* Driver selector for delivery orders */}
        {order.order_type === 'delivery' && (
          <div onClick={(e) => e.stopPropagation()}>
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
                className="mt-1 flex items-center gap-2 text-xs text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1.5 rounded-md transition-colors"
              >
                <Phone className="w-3 h-3" />
                <span>{getDriverPhone(order.driver_id)}</span>
              </a>
            )}
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

        {/* Delivery Status Dropdown */}
        {order.order_type === 'delivery' && order.status !== 'pending' && (
          <div className="mt-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateOrderStatus(order.id, 'preparing');
                  }}
                  className={order.status === 'preparing' ? 'bg-accent' : ''}
                >
                  🔥 Preparando
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateOrderStatus(order.id, 'ready');
                  }}
                  className={order.status === 'ready' ? 'bg-accent' : ''}
                >
                  ✅ Pronto
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateOrderStatus(order.id, 'out_for_delivery');
                  }}
                  className={order.status === 'out_for_delivery' ? 'bg-accent' : ''}
                >
                  <Truck className="w-4 h-4 mr-2" />
                  Em entrega
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateOrderStatus(order.id, 'delivered');
                  }}
                  className="text-green-600"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Entregue
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Action buttons - only for non-delivery orders */}
        {showAdvanceButton && order.order_type !== 'delivery' && (
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

        {/* Advance button for delivery in pending status */}
        {order.order_type === 'delivery' && order.status === 'pending' && (
          <Button 
            variant="outline" 
            className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground mt-2"
            onClick={(e) => {
              e.stopPropagation();
              updateOrderStatus(order.id, 'preparing');
            }}
          >
            Aceitar pedido
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}

        {showFinalizeButton && order.order_type !== 'delivery' && (
          <Button 
            variant="outline" 
            className="w-full border-green-600 text-green-600 hover:bg-green-600 hover:text-white mt-2"
            onClick={(e) => {
              e.stopPropagation();
              updateOrderStatus(order.id, 'delivered');
            }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Produto Entregue
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
            <span>Pedido {getOrderDisplayNumber(order)}</span>
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

            {/* Store Logo & Status */}
            <button
              onClick={() => setShowStoreControlModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                isStoreOpen 
                  ? 'bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20' 
                  : 'bg-muted border-muted-foreground/20 text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {restaurant?.logo_url ? (
                <img 
                  src={restaurant.logo_url} 
                  alt={restaurant.name} 
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <Store className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">
                {isStoreOpen ? 'Aberta' : 'Fechada'}
              </span>
              {isStoreOpen ? (
                <Power className="w-4 h-4" />
              ) : (
                <PowerOff className="w-4 h-4" />
              )}
            </button>
            
            {/* Filter tabs */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-full">
              <button 
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
                title="Todos os pedidos"
              >
                <span className="flex items-center gap-1">
                  Todos
                  {orderCounts.all > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-[20px] px-1.5 text-xs">
                      {orderCounts.all}
                    </Badge>
                  )}
                </span>
              </button>
              <button 
                className={`filter-tab ${filter === 'table' ? 'active' : ''}`}
                onClick={() => setFilter('table')}
                title="Pedidos de mesa"
              >
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <UtensilsCrossed className="w-4 h-4" />
                  <span className="text-xs">Mesa</span>
                  {orderCounts.table > 0 && (
                    <Badge className="h-5 min-w-[20px] px-1.5 text-xs bg-emerald-500 hover:bg-emerald-500 text-white">
                      {orderCounts.table}
                    </Badge>
                  )}
                </span>
              </button>
              <button 
                className={`filter-tab ${filter === 'tab' ? 'active' : ''}`}
                onClick={() => setFilter('tab')}
                title="Pedidos de comanda"
              >
                <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                  <User className="w-4 h-4" />
                  <span className="text-xs">Comanda</span>
                  {orderCounts.tab > 0 && (
                    <Badge className="h-5 min-w-[20px] px-1.5 text-xs bg-violet-500 hover:bg-violet-500 text-white">
                      {orderCounts.tab}
                    </Badge>
                  )}
                </span>
              </button>
              <button 
                className={`filter-tab ${filter === 'delivery' ? 'active' : ''}`}
                onClick={() => setFilter('delivery')}
                title="Pedidos para entrega"
              >
                <span className="flex items-center gap-1">
                  <Bike className="w-4 h-4" />
                  {orderCounts.delivery > 0 && (
                    <Badge className="h-5 min-w-[20px] px-1.5 text-xs bg-blue-500 hover:bg-blue-500 text-white">
                      {orderCounts.delivery}
                    </Badge>
                  )}
                </span>
              </button>
              <button 
                className={`filter-tab ${filter === 'counter' ? 'active' : ''}`}
                onClick={() => setFilter('counter')}
                title="Pedidos para retirada"
              >
                <span className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  {orderCounts.counter > 0 && (
                    <Badge className="h-5 min-w-[20px] px-1.5 text-xs bg-amber-500 hover:bg-amber-500 text-white">
                      {orderCounts.counter}
                    </Badge>
                  )}
                </span>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button className="top-action-btn" onClick={() => {
                  setNewOrderInitialType(undefined);
                  setShowNewOrderModal(true);
                }}>
                  <Plus className="w-4 h-4" />
                  Novo pedido
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium flex items-center gap-1">
                    <Keyboard className="w-3 h-3" /> Atalhos de teclado
                  </p>
                  <div className="text-xs space-y-0.5">
                    {SHORTCUT_DESCRIPTIONS.slice(0, 5).map((s, i) => (
                      <div key={i} className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{s.keys}</span>
                        <span>{s.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
            
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
                Pedido {selectedOrder && getOrderDisplayNumber(selectedOrder)}
              </DialogTitle>
              <DialogDescription>
                {selectedOrder && formatDateTime(selectedOrder.created_at)}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4">
                {/* Order Type Badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">
                    {getOrderTypeLabel(selectedOrder.order_type)}
                  </Badge>
                  <Badge className={
                    selectedOrder.status === 'ready' ? 'bg-green-500' :
                    selectedOrder.status === 'out_for_delivery' ? 'bg-blue-500' :
                    selectedOrder.status === 'preparing' ? 'bg-orange-500' : 
                    selectedOrder.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                  }>
                    {selectedOrder.status === 'pending' && 'Pendente'}
                    {selectedOrder.status === 'preparing' && 'Preparando'}
                    {selectedOrder.status === 'ready' && 'Pronto'}
                    {selectedOrder.status === 'out_for_delivery' && 'Em entrega'}
                    {selectedOrder.status === 'delivered' && 'Entregue'}
                  </Badge>
                </div>

                {/* Delivery Status Dropdown in Modal */}
                {selectedOrder.order_type === 'delivery' && selectedOrder.status !== 'delivered' && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <Label className="text-sm font-medium mb-2 block">Alterar Status</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <span className="flex items-center gap-2">
                            {selectedOrder.status === 'pending' && '⏳ Pendente'}
                            {selectedOrder.status === 'preparing' && '🔥 Preparando'}
                            {selectedOrder.status === 'ready' && '✅ Pronto'}
                            {selectedOrder.status === 'out_for_delivery' && (
                              <>
                                <Truck className="w-4 h-4" />
                                Em entrega
                              </>
                            )}
                          </span>
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-[250px]">
                        <DropdownMenuItem 
                          onClick={() => updateOrderStatus(selectedOrder.id, 'pending')}
                          className={selectedOrder.status === 'pending' ? 'bg-accent' : ''}
                        >
                          ⏳ Pendente
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                          className={selectedOrder.status === 'preparing' ? 'bg-accent' : ''}
                        >
                          🔥 Preparando
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => updateOrderStatus(selectedOrder.id, 'ready')}
                          className={selectedOrder.status === 'ready' ? 'bg-accent' : ''}
                        >
                          ✅ Pronto
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => updateOrderStatus(selectedOrder.id, 'out_for_delivery')}
                          className={selectedOrder.status === 'out_for_delivery' ? 'bg-accent' : ''}
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Em entrega
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            updateOrderStatus(selectedOrder.id, 'delivered');
                            setShowOrderDetailModal(false);
                          }}
                          className="text-green-600"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Entregue
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            setOrderToCancel(selectedOrder);
                            setShowCancelDialog(true);
                          }}
                          className="text-destructive"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelado
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* Order Info */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Informações do Pedido</h4>
                  
                  {/* Order Time */}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>Criado em: {formatDateTime(selectedOrder.created_at)}</span>
                  </div>

                  {/* Timer */}
                  {getOrderTimer(selectedOrder) && selectedOrder.status === 'preparing' && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className={`font-medium ${getOrderTimer(selectedOrder)?.isOverdue ? 'text-destructive' : ''}`}>
                          ⏱ Tempo: {formatElapsedTime(getOrderTimer(selectedOrder)!.elapsed)} / {getOrderTimer(selectedOrder)!.limit}min
                        </span>
                        {getOrderTimer(selectedOrder)?.isOverdue && (
                          <span className="text-destructive font-semibold">
                            Atrasado!
                          </span>
                        )}
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 rounded-full ${
                            getOrderTimer(selectedOrder)?.isOverdue 
                              ? 'bg-destructive' 
                              : (getOrderTimer(selectedOrder)?.percentage || 0) > 75 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(getOrderTimer(selectedOrder)?.percentage || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Waiter */}
                  {getWaiterName(selectedOrder.waiter_id) && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <ChefHat className="w-4 h-4" />
                      <span>Garçom: {getWaiterName(selectedOrder.waiter_id)}</span>
                    </div>
                  )}
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
                  {getOrderLocationInfo(selectedOrder) && (
                    <div className={`flex items-center gap-2 font-medium px-2 py-1 rounded ${
                      getOrderLocationInfo(selectedOrder)?.type === 'table'
                        ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40'
                        : 'text-violet-700 bg-violet-100 dark:text-violet-300 dark:bg-violet-900/40'
                    }`}>
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>{getOrderLocationInfo(selectedOrder)?.label}</span>
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

            <DialogFooter className="flex flex-wrap gap-2 sm:gap-2">
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
              {selectedOrder && (
                <PrintReceipt 
                  order={{
                    ...selectedOrder,
                    order_items: selectedOrder.order_items?.map(item => ({
                      product_name: item.product_name,
                      quantity: item.quantity,
                      product_price: item.product_price,
                    })),
                  }} 
                  restaurantName={restaurant?.name}
                  onPrint={async () => {
                    const newCount = (selectedOrder.print_count || 0) + 1;
                    const isReprint = (selectedOrder.print_count || 0) > 0;
                    
                    await supabase
                      .from('orders')
                      .update({ 
                        print_count: newCount,
                        printed_at: new Date().toISOString()
                      })
                      .eq('id', selectedOrder.id);
                    
                    // Log the print action
                    await logPrint({
                      orderId: selectedOrder.id,
                      orderNumber: selectedOrder.order_number,
                      printerName: 'Navegador',
                      itemsCount: selectedOrder.order_items?.length || 0,
                      status: 'success',
                      eventType: isReprint ? 'reprint' : 'print',
                    });
                    
                    // Update local state
                    setSelectedOrder(prev => prev ? { ...prev, print_count: newCount } : null);
                    fetchOrders();
                  }}
                />
              )}
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
                Tem certeza que deseja cancelar o pedido {orderToCancel && getOrderDisplayNumber(orderToCancel)}? 
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
          onOpenChange={(open) => {
            setShowNewOrderModal(open);
            if (!open) setNewOrderInitialType(undefined);
          }}
          onOrderCreated={fetchOrders}
          shouldAutoPrint={shouldAutoPrint}
          initialOrderType={newOrderInitialType}
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

        {/* Store Control Modal */}
        <StoreControlModal
          open={showStoreControlModal}
          onOpenChange={setShowStoreControlModal}
          isOpen={isStoreOpen}
          onStoreStatusChange={setIsStoreOpen}
        />
      </div>
    </DashboardLayout>
  );
}
