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
import { CheckoutScreen } from '@/components/dashboard/CheckoutScreen';
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
  status?: string;
}

interface Tab {
  id: string;
  number: number;
  customer_name: string | null;
  status?: string;
}

// Types for close modals (with required status)
interface TableForClose {
  id: string;
  number: number;
  status: string;
}

interface TabForClose {
  id: string;
  number: number;
  customer_name: string | null;
  status: string;
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
  
  // Close table/tab modal states
  const [showCloseTableModal, setShowCloseTableModal] = useState(false);
  const [showCloseTabModal, setShowCloseTabModal] = useState(false);
  const [tableToClose, setTableToClose] = useState<TableForClose & { orders: Order[] } | null>(null);
  const [tabToClose, setTabToClose] = useState<TabForClose & { orders: Order[] } | null>(null);

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

  // Timer update every second for real-time countdown
  const [, setTimerTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimerTick(t => t + 1);
    }, 1000); // Update every second
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
        .in('status', ['pending', 'preparing', 'ready', 'served', 'out_for_delivery', 'delivered'])
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

  const getOrderTimer = (order: Order): { elapsed: number; elapsedSeconds: number; limit: number; isOverdue: boolean; percentage: number } | null => {
    // Show timer for all active orders (not just preparing)
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return null;
    }
    
    // Use created_at as the time when order was created
    const startTime = new Date(order.created_at);
    const now = new Date();
    const totalSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const elapsedMinutes = Math.floor(totalSeconds / 60);
    
    const { max } = getOrderPrepTime(order.order_type);
    const percentage = Math.min((elapsedMinutes / max) * 100, 100);
    
    return {
      elapsed: elapsedMinutes,
      elapsedSeconds: totalSeconds,
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

  const formatElapsedTimeWithSeconds = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
  const allServedOrders = orders.filter(o => o.status === 'served');

  const pendingOrders = filterOrdersByType(allPendingOrders);
  const preparingOrders = filterOrdersByType(allPreparingOrders);
  const readyOrders = filterOrdersByType(allReadyOrders);
  const servedOrders = filterOrdersByType(allServedOrders);

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
      'served': 'served',
    };

    const targetStatus = statusMap[newStatus];
    if (targetStatus && order.status !== targetStatus) {
      // Prevent table/tab orders from going directly to 'delivered'
      // They must go through 'served' first and then closed via checkout
      if (targetStatus === 'served' && !order.table_id && !order.tab_id) {
        // Non-table/tab orders can skip 'served' and go to 'delivered'
        updateOrderStatus(orderId, 'delivered');
      } else {
        updateOrderStatus(orderId, targetStatus);
      }
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

  // Function to handle close table/tab from order card
  const handleCloseTableFromOrder = (order: Order) => {
    if (order.table_id) {
      const table = tables.find(t => t.id === order.table_id);
      if (table) {
        // Get all orders for this table
        const tableOrders = orders.filter(o => 
          o.table_id === order.table_id && 
          ['pending', 'preparing', 'ready', 'served'].includes(o.status || '')
        );
        setTableToClose({ ...table, status: 'occupied', orders: tableOrders });
        setShowCloseTableModal(true);
      }
    } else if (order.tab_id) {
      const tab = tabs.find(t => t.id === order.tab_id);
      if (tab) {
        // Get all orders for this tab
        const tabOrders = orders.filter(o => 
          o.tab_id === order.tab_id && 
          ['pending', 'preparing', 'ready', 'served'].includes(o.status || '')
        );
        setTabToClose({ ...tab, status: tab.status || 'occupied', orders: tabOrders });
        setShowCloseTabModal(true);
      }
    }
  };

  // Draggable Order Card Component - Compact design
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

    // Check if this order should show close button (ready or served table/tab orders)
    const showCloseButton = (order.status === 'ready' || order.status === 'served') && 
                            (order.table_id || order.tab_id);
    
    // Determine the card border color based on type
    const getCardBorderClass = () => {
      if (order.table_id) return 'border-l-[3px] border-l-emerald-500';
      if (order.tab_id) return 'border-l-[3px] border-l-violet-500';
      if (order.order_type === 'delivery') return 'border-l-[3px] border-l-blue-500';
      if (order.order_type === 'counter' || order.order_type === 'takeaway') return 'border-l-[3px] border-l-amber-500';
      return '';
    };

    return (
      <div 
        ref={setNodeRef} 
        style={style}
        className={`bg-card rounded-lg border shadow-sm overflow-hidden transition-all hover:shadow-md relative ${getCardBorderClass()} ${
          delayed && order.status !== 'delivered' ? 'ring-1 ring-destructive' : ''
        } ${isDragging ? 'shadow-xl z-50' : ''} animate-scale-in`}
      >
        {/* Drag Handle */}
        <div 
          {...listeners} 
          {...attributes}
          className="absolute top-1.5 right-1.5 p-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Card Content - Clickable area */}
        <div 
          className="p-3 cursor-pointer"
          onClick={() => handleOpenOrderDetail(order)}
        >
          {/* Header Row: Order number, Timer */}
          <div className="flex items-center justify-between mb-1.5 pr-5">
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">
                {getOrderTypeIcon(order.order_type)}
              </span>
              <span className="font-semibold text-sm text-foreground">
                #{getOrderDisplayNumber(order)}
              </span>
            </div>
            
            {/* Timer Badge - Real-time countdown */}
            {timer && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold ${
                timer.isOverdue 
                  ? 'bg-destructive/10 text-destructive animate-pulse' 
                  : timer.percentage > 75
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              }`}>
                <Clock className="w-3 h-3" />
                <span>{formatElapsedTimeWithSeconds(timer.elapsedSeconds)}</span>
              </div>
            )}
            
            {/* Time badge if no timer (for delivered orders) */}
            {!timer && (
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                delayed ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
              }`}>
                <Clock className="w-2.5 h-2.5" />
                {formatTime(order.created_at)}
              </div>
            )}
          </div>

          {/* Customer Name and Total Row */}
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground truncate max-w-[120px]">
              {order.customer_name || 'Não identificado'}
            </span>
            <span className="font-bold text-sm">{formatCurrency(order.total)}</span>
          </div>

          {/* Waiter info - compact */}
          {waiterName && (
            <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 mb-1.5">
              <ChefHat className="w-2.5 h-2.5" />
              <span className="truncate">{waiterName}</span>
            </div>
          )}

          {/* Table or Tab location badge - compact */}
          {locationInfo && (
            <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
              locationInfo.type === 'table' 
                ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30' 
                : 'text-violet-700 bg-violet-50 dark:text-violet-300 dark:bg-violet-900/30'
            }`}>
              <UtensilsCrossed className="w-3 h-3" />
              {locationInfo.label}
            </div>
          )}

          {/* Order type badge for non-table orders - compact */}
          {order.order_type && order.order_type !== 'table' && !locationInfo && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">
              {getOrderTypeIcon(order.order_type)}
              <span className="ml-0.5">{getOrderTypeLabel(order.order_type)}</span>
            </Badge>
          )}
        </div>

        {/* Timer Progress Bar for preparing - thinner */}
        {timer && order.status === 'preparing' && (
          <div className="px-3 pb-1.5">
            <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
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

        {/* Driver selector for delivery orders - compact */}
        {order.order_type === 'delivery' && (
          <div className="px-3 pb-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={`w-full h-7 justify-between text-[11px] ${
                    order.driver_id 
                      ? 'border-blue-500 text-blue-600 bg-blue-50' 
                      : 'border-dashed'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Bike className="w-3 h-3" />
                    {order.driver_id ? getDriverName(order.driver_id) : 'Motoboy'}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[160px]">
                {drivers.length === 0 ? (
                  <DropdownMenuItem disabled className="text-xs">
                    Nenhum cadastrado
                  </DropdownMenuItem>
                ) : (
                  <>
                    {drivers.map((driver) => (
                      <DropdownMenuItem
                        key={driver.id}
                        onClick={() => updateOrderDriver(order.id, driver.id, order)}
                        className={`text-xs ${order.driver_id === driver.id ? 'bg-accent' : ''}`}
                      >
                        <Bike className="w-3 h-3 mr-1.5" />
                        {driver.name}
                      </DropdownMenuItem>
                    ))}
                    {order.driver_id && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => updateOrderDriver(order.id, null)}
                          className="text-destructive text-xs"
                        >
                          <X className="w-3 h-3 mr-1.5" />
                          Remover
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* WhatsApp button for assigned driver - inline compact */}
            {order.driver_id && getDriverPhone(order.driver_id) && (
              <a
                href={formatWhatsAppLink(getDriverPhone(order.driver_id)!)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2 py-1 rounded transition-colors"
              >
                <Phone className="w-2.5 h-2.5" />
                <span>{getDriverPhone(order.driver_id)}</span>
              </a>
            )}
          </div>
        )}

        {/* Items preview - compact */}
        {order.order_items && order.order_items.length > 0 && (
          <div 
            className="px-3 py-1.5 border-t text-[10px] text-muted-foreground cursor-pointer"
            onClick={() => handleOpenOrderDetail(order)}
          >
            {order.order_items.slice(0, 2).map((item) => (
              <div key={item.id} className="truncate">
                {item.quantity}x {item.product_name}
              </div>
            ))}
            {order.order_items.length > 2 && (
              <div className="text-primary">+{order.order_items.length - 2} mais</div>
            )}
          </div>
        )}

        {/* Delivery Status Dropdown - compact */}
        {order.order_type === 'delivery' && order.status !== 'pending' && (
          <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className={`w-full h-7 justify-between text-xs ${
                    order.status === 'out_for_delivery' 
                      ? 'border-blue-500 text-blue-600 bg-blue-50' 
                      : ''
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {order.status === 'preparing' && '🔥 Preparando'}
                    {order.status === 'ready' && '✅ Pronto'}
                    {order.status === 'served' && '🍽️ Servido'}
                    {order.status === 'out_for_delivery' && (
                      <>
                        <Truck className="w-3 h-3" />
                        Em entrega
                      </>
                    )}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[160px]">
                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'preparing')} className="text-xs">
                  🔥 Preparando
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'ready')} className="text-xs">
                  ✅ Pronto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'out_for_delivery')} className="text-xs">
                  <Truck className="w-3 h-3 mr-1.5" />
                  Em entrega
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => updateOrderStatus(order.id, 'delivered')}
                  className="text-green-600 text-xs"
                >
                  <CheckCircle className="w-3 h-3 mr-1.5" />
                  Finalizado
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Close Table/Tab Button - Main action for ready/served orders - compact */}
        {showCloseButton && locationInfo && (
          <div 
            className="px-3 pb-3" 
            onClick={(e) => e.stopPropagation()}
          >
            <Button 
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium h-8 text-xs"
              onClick={() => handleCloseTableFromOrder(order)}
            >
              Fechar {locationInfo.type === 'table' ? 'mesa' : 'comanda'} →
            </Button>
          </div>
        )}

        {/* Action buttons for non-delivery, non-table/tab orders - compact */}
        {showAdvanceButton && order.order_type !== 'delivery' && !showCloseButton && (
          <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="outline" 
              size="sm"
              className="w-full h-7 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => {
                const nextStatus = order.status === 'pending' 
                  ? 'preparing' 
                  : order.status === 'preparing' 
                    ? 'ready' 
                    : 'served';
                updateOrderStatus(order.id, nextStatus);
              }}
            >
              {order.status === 'ready' ? 'Marcar servido' : 'Avançar'}
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        )}

        {/* Advance button for delivery in pending status - compact */}
        {order.order_type === 'delivery' && order.status === 'pending' && (
          <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="outline" 
              size="sm"
              className="w-full h-7 text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => updateOrderStatus(order.id, 'preparing')}
            >
              Aceitar
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        )}

        {/* Finalize button - only for counter/takeaway orders (not table/tab) - compact */}
        {showFinalizeButton && (order.order_type === 'counter' || order.order_type === 'takeaway') && !order.table_id && !order.tab_id && (
          <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="outline" 
              size="sm"
              className="w-full h-7 text-xs border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
              onClick={() => updateOrderStatus(order.id, 'delivered')}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Entregue
            </Button>
          </div>
        )}

        {/* Mark as served button - for table/tab orders in ready status - compact */}
        {showFinalizeButton && (order.table_id || order.tab_id) && order.status === 'ready' && (
          <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="outline" 
              size="sm"
              className="w-full h-7 text-xs border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white"
              onClick={() => updateOrderStatus(order.id, 'served')}
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Servido
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

  // Finalize all ready orders - only for counter/delivery orders (NOT table/tab)
  const handleFinalizeAllReady = async () => {
    for (const order of readyOrders) {
      // Table and tab orders should go to "served" status, not "delivered"
      // They can only be "delivered" when the table/tab is closed with payment
      if (order.table_id || order.tab_id) {
        await updateOrderStatus(order.id, 'served');
      } else {
        await updateOrderStatus(order.id, 'delivered');
      }
    }
  };

  // Initial loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-center space-y-6 animate-fade-in-up">
            <div className="relative inline-flex">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-foreground">Carregando pedidos...</p>
              <p className="text-sm text-muted-foreground">Preparando seu dashboard</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col animate-fade-in-up">
        {/* Top Bar - Compact */}
        <div className="bg-card border-b px-3 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <SidebarTrigger />

            {/* Store Logo & Status - compact */}
            <button
              onClick={() => setShowStoreControlModal(true)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all text-xs ${
                isStoreOpen 
                  ? 'bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20' 
                  : 'bg-muted border-muted-foreground/20 text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {restaurant?.logo_url ? (
                <img 
                  src={restaurant.logo_url} 
                  alt={restaurant.name} 
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <Store className="w-4 h-4" />
              )}
              <span className="font-medium hidden sm:inline">
                {isStoreOpen ? 'Aberta' : 'Fechada'}
              </span>
              {isStoreOpen ? (
                <Power className="w-3 h-3" />
              ) : (
                <PowerOff className="w-3 h-3" />
              )}
            </button>
            
            {/* Filter tabs - compact */}
            <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg overflow-x-auto">
              <button 
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${filter === 'all' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                onClick={() => setFilter('all')}
                title="Todos"
              >
                <span className="flex items-center gap-1">
                  Todos
                  {orderCounts.all > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px]">
                      {orderCounts.all}
                    </Badge>
                  )}
                </span>
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${filter === 'table' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                onClick={() => setFilter('table')}
                title="Mesa"
              >
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <UtensilsCrossed className="w-3 h-3" />
                  {orderCounts.table > 0 && (
                    <Badge className="h-4 min-w-[16px] px-1 text-[10px] bg-emerald-500 hover:bg-emerald-500 text-white">
                      {orderCounts.table}
                    </Badge>
                  )}
                </span>
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${filter === 'tab' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                onClick={() => setFilter('tab')}
                title="Comanda"
              >
                <span className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                  <User className="w-3 h-3" />
                  {orderCounts.tab > 0 && (
                    <Badge className="h-4 min-w-[16px] px-1 text-[10px] bg-violet-500 hover:bg-violet-500 text-white">
                      {orderCounts.tab}
                    </Badge>
                  )}
                </span>
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${filter === 'delivery' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                onClick={() => setFilter('delivery')}
                title="Delivery"
              >
                <span className="flex items-center gap-1">
                  <Bike className="w-3 h-3 text-blue-500" />
                  {orderCounts.delivery > 0 && (
                    <Badge className="h-4 min-w-[16px] px-1 text-[10px] bg-blue-500 hover:bg-blue-500 text-white">
                      {orderCounts.delivery}
                    </Badge>
                  )}
                </span>
              </button>
              <button 
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${filter === 'counter' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                onClick={() => setFilter('counter')}
                title="Balcão"
              >
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3 text-amber-500" />
                  {orderCounts.counter > 0 && (
                    <Badge className="h-4 min-w-[16px] px-1 text-[10px] bg-amber-500 hover:bg-amber-500 text-white">
                      {orderCounts.counter}
                    </Badge>
                  )}
                </span>
              </button>
            </div>

            {/* Search - compact */}
            <div className="flex-1 min-w-[160px] max-w-xs">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input 
                  placeholder="Buscar pedido..."
                  className="pl-7 h-8 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Actions */}
            {/* Actions - compact */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" className="h-8 text-xs" onClick={() => {
                  setNewOrderInitialType(undefined);
                  setShowNewOrderModal(true);
                }}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden sm:inline">Novo</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-medium flex items-center gap-1 text-xs">
                    <Keyboard className="w-3 h-3" /> Atalhos
                  </p>
                  <div className="text-[10px] space-y-0.5">
                    {SHORTCUT_DESCRIPTIONS.slice(0, 3).map((s, i) => (
                      <div key={i} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{s.keys}</span>
                        <span>{s.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
            
            {/* Icon buttons - compact */}
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon"
                className={`h-8 w-8 ${soundEnabled ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={toggleSound}
                title={soundEnabled ? 'Som ativado' : 'Som desativado'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>
              
              <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowPrintSettingsModal(true)}
                title="Impressão"
              >
                <Printer className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Kanban Board with DnD */}
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-hidden p-3 flex gap-3">
            {/* Kanban Columns */}
            <div className="flex-1 h-full flex gap-3 kanban-scroll overflow-x-auto">
              {/* Column: Em análise */}
              <DroppableColumn 
                id="column-pending" 
                className="w-64 lg:w-72 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden"
              >
                <div className="kanban-header analysis py-2 px-3">
                  <span className="text-sm">Em análise</span>
                  <Badge variant="secondary" className="bg-white/20 text-white h-5 text-[10px]">
                    {pendingOrders.length}
                  </Badge>
                </div>
                
                {/* Auto accept toggle - compact */}
                <div className="p-2.5 bg-card border-b">
                  <div className="text-[11px] space-y-0.5 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Balcão:</span> {prepTimes.counter_min}-{prepTimes.counter_max}min{' '}
                      <span 
                        className="text-primary cursor-pointer hover:underline"
                        onClick={() => setShowPrepTimeModal(true)}
                      >
                        ✏️
                      </span>
                    </p>
                    <p><span className="font-medium text-foreground">Delivery:</span> {prepTimes.delivery_min}-{prepTimes.delivery_max}min</p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Switch checked={autoAccept} onCheckedChange={setAutoAccept} className="scale-75" />
                    <span className="text-[10px]">Auto-aceitar</span>
                  </div>
                </div>

                {pendingOrders.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
                    <div className="w-8 h-8 mb-2 opacity-50 text-2xl">↩</div>
                    <p className="text-xs">
                      {autoAccept ? 'Auto-aceite ativado' : 'Sem pedidos'}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {pendingOrders.map(order => (
                      <DraggableOrderCard key={order.id} order={order} showAdvanceButton />
                    ))}
                  </div>
                )}
              </DroppableColumn>

              {/* Column: Em produção */}
              <DroppableColumn 
                id="column-preparing" 
                className="w-64 lg:w-72 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden"
              >
                <div className="kanban-header production py-2 px-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">Em produção</span>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white h-5 text-[10px]">
                    {preparingOrders.length}
                  </Badge>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {preparingOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
                      <ChefHat className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-xs">Nenhum em produção</p>
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
                className="w-64 lg:w-72 flex-shrink-0 flex flex-col bg-muted/30 rounded-lg overflow-hidden"
              >
                <div className="kanban-header ready py-2 px-3">
                  <span className="text-sm">Prontos</span>
                  <div className="flex items-center gap-1.5">
                    {readyOrders.length > 0 && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-5 text-[10px] px-1.5"
                        onClick={handleFinalizeAllReady}
                      >
                        Todos
                      </Button>
                    )}
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      {readyOrders.length}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {readyOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-4 text-center text-muted-foreground">
                      <UtensilsCrossed className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-xs">Nenhum pronto</p>
                    </div>
                  ) : (
                    readyOrders.map(order => (
                      <DraggableOrderCard key={order.id} order={order} showFinalizeButton />
                    ))
                  )}
                </div>
              </DroppableColumn>

              {/* Served Orders Column - Only for table/tab orders awaiting table close */}
              {servedOrders.length > 0 && (
                <DroppableColumn 
                  id="served" 
                  className="w-64 lg:w-72 flex-shrink-0 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800"
                >
                  <div className="py-2 px-3 border-b border-purple-200 dark:border-purple-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-purple-700 dark:text-purple-300">
                      🍽️ Servidos
                    </span>
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 h-5 text-[10px]">
                      {servedOrders.length}
                    </Badge>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {servedOrders.map(order => (
                      <DraggableOrderCard key={order.id} order={order} />
                    ))}
                    <p className="text-[10px] text-center text-muted-foreground mt-1">
                      Aguardando fechamento
                    </p>
                  </div>
                </DroppableColumn>
              )}
            </div>

            {/* Right Sidebar - Table/Tab Stats */}
            <div className="w-14 flex-shrink-0 flex flex-col gap-2">
              {/* Open Tables Counter */}
              <div className="bg-card border rounded-lg p-2 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-lg font-bold text-foreground">
                  {orders.filter(o => o.table_id && !['delivered', 'cancelled'].includes(o.status || '')).reduce((acc, o) => {
                    if (!acc.includes(o.table_id!)) acc.push(o.table_id!);
                    return acc;
                  }, [] as string[]).length}
                </span>
                <span className="text-[9px] text-muted-foreground text-center leading-tight">Mesas</span>
              </div>

              {/* Open Tabs Counter */}
              <div className="bg-card border rounded-lg p-2 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-lg font-bold text-foreground">
                  {orders.filter(o => o.tab_id && !['delivered', 'cancelled'].includes(o.status || '')).reduce((acc, o) => {
                    if (!acc.includes(o.tab_id!)) acc.push(o.tab_id!);
                    return acc;
                  }, [] as string[]).length}
                </span>
                <span className="text-[9px] text-muted-foreground text-center leading-tight">Comandas</span>
              </div>

              {/* Delivery Counter */}
              <div className="bg-card border rounded-lg p-2 flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Bike className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-lg font-bold text-foreground">
                  {orders.filter(o => o.order_type === 'delivery' && !['delivered', 'cancelled'].includes(o.status || '')).length}
                </span>
                <span className="text-[9px] text-muted-foreground text-center leading-tight">Delivery</span>
              </div>
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
                    selectedOrder.status === 'served' ? 'bg-purple-500' :
                    selectedOrder.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                  }>
                    {selectedOrder.status === 'pending' && 'Pendente'}
                    {selectedOrder.status === 'preparing' && 'Preparando'}
                    {selectedOrder.status === 'ready' && 'Pronto'}
                    {selectedOrder.status === 'served' && 'Servido'}
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

        {/* Checkout Screen for Table */}
        {showCloseTableModal && tableToClose && (
          <CheckoutScreen
            type="table"
            entityId={tableToClose.id}
            entityNumber={tableToClose.number}
            orders={tableToClose.orders}
            onClose={() => {
              setShowCloseTableModal(false);
              setTableToClose(null);
            }}
            onClosed={() => {
              fetchOrders();
              fetchTables();
              setShowCloseTableModal(false);
              setTableToClose(null);
            }}
          />
        )}

        {/* Checkout Screen for Tab */}
        {showCloseTabModal && tabToClose && (
          <CheckoutScreen
            type="tab"
            entityId={tabToClose.id}
            entityNumber={tabToClose.number}
            customerName={tabToClose.customer_name}
            orders={tabToClose.orders}
            onClose={() => {
              setShowCloseTabModal(false);
              setTabToClose(null);
            }}
            onClosed={() => {
              fetchOrders();
              fetchTabs();
              setShowCloseTabModal(false);
              setTabToClose(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
