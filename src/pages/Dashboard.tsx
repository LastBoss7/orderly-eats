import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
import { DashboardSkeleton, DashboardContent } from '@/components/dashboard/OrderCardSkeleton';
import { VirtualizedColumn } from '@/components/dashboard/VirtualizedColumn';
import { DroppableColumn } from '@/components/dashboard/DroppableColumn';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { PremiumOrderCard } from '@/components/dashboard/PremiumOrderCard';
import { KanbanColumn } from '@/components/dashboard/KanbanColumn';
import { AnimatePresence, motion } from 'framer-motion';
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
import { useDraggable } from '@dnd-kit/core';
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
  Activity,
  Maximize2,
  Minimize2,
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
  ready_at: string | null;
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
  const [recentlyUpdatedOrders, setRecentlyUpdatedOrders] = useState<Set<string>>(new Set());
  const [recentActivity, setRecentActivity] = useState<{ orderId: string; timestamp: number; status: string }[]>([]);
  const [isCompactMode, setIsCompactMode] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('dashboard-compact-mode');
    return saved === 'true';
  });
  const [prepTimes, setPrepTimes] = useState<PrepTimeSettings>({
    counter_min: 10,
    counter_max: 50,
    delivery_min: 25,
    delivery_max: 80,
  });
  
  // Save compact mode preference
  useEffect(() => {
    localStorage.setItem('dashboard-compact-mode', String(isCompactMode));
  }, [isCompactMode]);
  
  // Close table/tab modal states
  const [showCloseTableModal, setShowCloseTableModal] = useState(false);
  const [showCloseTabModal, setShowCloseTabModal] = useState(false);
  const [tableToClose, setTableToClose] = useState<TableForClose & { orders: Order[] } | null>(null);
  const [tabToClose, setTabToClose] = useState<TabForClose & { orders: Order[] } | null>(null);
  
  // Clean up old activity entries (older than 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      setRecentActivity(prev => prev.filter(a => a.timestamp > fiveMinutesAgo));
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

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

  // DnD sensors - increased distance to prevent accidental drags when clicking
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 15, // Increased from 8 to prevent accidental drags on click
        delay: 150, // Add delay before drag activates
        tolerance: 5,
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
  // Using ref to track processed orders to avoid infinite loops
  const processedOrdersRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!autoAccept || !restaurant?.id) return;

    const autoAcceptOrders = async () => {
      const pendingOrders = orders.filter(o => 
        o.status === 'pending' && !processedOrdersRef.current.has(o.id)
      );
      
      if (pendingOrders.length === 0) return;
      
      // Mark orders as being processed to avoid re-processing
      pendingOrders.forEach(o => processedOrdersRef.current.add(o.id));
      
      for (const order of pendingOrders) {
        await supabase
          .from('orders')
          .update({ status: 'preparing' })
          .eq('id', order.id);
      }
      
      fetchOrders();
    };

    autoAcceptOrders();
  }, [autoAccept, orders, restaurant?.id]);

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

  const getOrderTimer = (order: Order): { elapsed: number; elapsedSeconds: number; limit: number; isOverdue: boolean; percentage: number; isStopped: boolean } | null => {
    // Don't show timer for delivered or cancelled orders
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return null;
    }
    
    const startTime = new Date(order.created_at);
    let endTime: Date;
    let isStopped = false;
    
    // If order is ready or served, stop the timer at ready_at timestamp
    if ((order.status === 'ready' || order.status === 'served') && order.ready_at) {
      endTime = new Date(order.ready_at);
      isStopped = true;
    } else if (order.status === 'ready' || order.status === 'served') {
      // Fallback: use updated_at if ready_at is not available
      endTime = new Date(order.updated_at);
      isStopped = true;
    } else {
      // Still preparing - use current time
      endTime = new Date();
    }
    
    const totalSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    const elapsedMinutes = Math.floor(totalSeconds / 60);
    
    const { max } = getOrderPrepTime(order.order_type);
    const percentage = Math.min((elapsedMinutes / max) * 100, 100);
    
    return {
      elapsed: elapsedMinutes,
      elapsedSeconds: totalSeconds,
      limit: max,
      isOverdue: elapsedMinutes > max,
      percentage,
      isStopped,
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
      // Ensure we don't double the # if it's already there
      const numStr = String(order.order_number);
      return numStr.startsWith('#') ? numStr : `#${numStr}`;
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
    
    // Add visual flash feedback
    setRecentlyUpdatedOrders(prev => new Set(prev).add(orderId));
    
    // Track recent activity
    setRecentActivity(prev => [
      ...prev,
      { orderId, timestamp: Date.now(), status }
    ]);
    
    // Remove flash after animation completes
    setTimeout(() => {
      setRecentlyUpdatedOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }, 1500);
    
    // Update local orders state immediately for faster UI
    setOrders(prev => {
      const updated = prev.map(o => 
        o.id === orderId ? { ...o, status, updated_at: updateData.updated_at, ready_at: updateData.ready_at || o.ready_at } : o
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
    
    // Get order details for better notification
    const order = orders.find(o => o.id === orderId);
    const orderNumber = order ? getOrderDisplayNumber(order) : '';
    
    // Status-specific notifications with icons
    const statusMessages: Record<string, { message: string; icon: string }> = {
      'preparing': { message: `Pedido ${orderNumber} em preparo! 🔥`, icon: '🔥' },
      'ready': { message: `Pedido ${orderNumber} pronto! ✅`, icon: '✅' },
      'served': { message: `Pedido ${orderNumber} servido! 🍽️`, icon: '🍽️' },
      'delivered': { message: `Pedido ${orderNumber} entregue! 📦`, icon: '📦' },
      'out_for_delivery': { message: `Pedido ${orderNumber} saiu para entrega! 🚚`, icon: '🚚' },
    };
    
    const notification = statusMessages[status] || { message: `Pedido atualizado com sucesso!`, icon: '✓' };
    
    toast.success(notification.message, {
      duration: 3000,
      icon: notification.icon,
    });
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
    const isRecentlyUpdated = recentlyUpdatedOrders.has(order.id);

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

    // COMPACT MODE CARD
    if (isCompactMode) {
      return (
        <div 
          ref={setNodeRef} 
          style={style}
          className={`order-card relative ${getCardBorderClass()} ${
            delayed && order.status !== 'delivered' ? 'delayed' : ''
          } ${isDragging ? 'z-50 opacity-50' : ''} ${isRecentlyUpdated ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950/30' : ''}`}
        >
          {/* Drag Handle - Compact */}
          <div 
            {...listeners} 
            {...attributes}
            className="absolute top-1.5 right-1 p-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 z-10 hover:text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {/* Compact Card Content */}
          <div 
            className="p-2.5 cursor-pointer"
            onClick={() => handleOpenOrderDetail(order)}
          >
            {/* Single Row: Icon, Number, Location/Type, Timer, Total */}
            <div className="flex items-center gap-2 pr-4">
              <span className="w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0">
                {getOrderTypeIcon(order.order_type)}
              </span>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-foreground">
                    {getOrderDisplayNumber(order)}
                  </span>
                  {delayed && order.status === 'preparing' && (
                    <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
                      ATRASADO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {locationInfo ? (
                    <span className={`font-medium ${locationInfo.type === 'table' ? 'text-emerald-600' : 'text-violet-600'}`}>
                      {locationInfo.label}
                    </span>
                  ) : (
                    <span className="truncate max-w-[100px]">{order.customer_name || 'Não identificado'}</span>
                  )}
                </div>
              </div>
              
              {/* Timer Badge - Compact */}
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold flex-shrink-0 ${
                timer?.isOverdue 
                  ? 'bg-destructive/10 text-destructive' 
                  : timer && timer.percentage > 75
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground'
              }`}>
                <Clock className="w-2.5 h-2.5" />
                {timer ? formatElapsedTimeWithSeconds(timer.elapsedSeconds) : formatTime(order.created_at)}
              </div>
              
              {/* Total - Compact */}
              <span className="font-bold text-sm flex-shrink-0">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Compact Action Buttons */}
          {(showAdvanceButton || showFinalizeButton || showCloseButton) && (
            <div className="px-2.5 pb-2" onClick={(e) => e.stopPropagation()}>
              {showCloseButton && locationInfo && (
                <button 
                  className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium h-7 text-xs rounded flex items-center justify-center gap-1 transition-colors"
                  onClick={() => handleCloseTableFromOrder(order)}
                >
                  Fechar {locationInfo.type === 'table' ? 'mesa' : 'comanda'} →
                </button>
              )}
              
              {showAdvanceButton && order.order_type !== 'delivery' && !showCloseButton && (
                <button 
                  className="w-full h-7 text-xs border border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded flex items-center justify-center gap-1 bg-background font-medium transition-colors"
                  onClick={() => {
                    const nextStatus = order.status === 'pending' ? 'preparing' : order.status === 'preparing' ? 'ready' : 'served';
                    updateOrderStatus(order.id, nextStatus);
                  }}
                >
                  {order.status === 'ready' ? 'Servido' : 'Avançar'} →
                </button>
              )}
              
              {showFinalizeButton && (order.order_type === 'counter' || order.order_type === 'takeaway') && !order.table_id && !order.tab_id && (
                <button 
                  className="w-full h-7 text-xs border border-green-600 text-green-600 hover:bg-green-600 hover:text-white rounded flex items-center justify-center gap-1 bg-background font-medium transition-colors"
                  onClick={() => updateOrderStatus(order.id, 'delivered')}
                >
                  <CheckCircle className="w-3 h-3" />
                  Entregue
                </button>
              )}
              
              {showFinalizeButton && (order.table_id || order.tab_id) && order.status === 'ready' && (
                <button 
                  className="w-full h-7 text-xs border border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white rounded flex items-center justify-center gap-1 bg-background font-medium transition-colors"
                  onClick={() => updateOrderStatus(order.id, 'served')}
                >
                  Servido
                </button>
              )}
            </div>
          )}
        </div>
      );
    }

    // EXPANDED MODE CARD (default)
    return (
      <div 
        ref={setNodeRef} 
        style={style}
        className={`order-card relative ${getCardBorderClass()} ${
          delayed && order.status !== 'delivered' ? 'delayed' : ''
        } ${isDragging ? 'z-50 opacity-50' : ''} ${isRecentlyUpdated ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-950/30' : ''}`}
      >
        {/* Drag Handle */}
        <div 
          {...listeners} 
          {...attributes}
          className="absolute top-2 right-2 p-1 cursor-grab active:cursor-grabbing text-muted-foreground/40 z-10 hover:text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Card Content - Clickable area */}
        <div 
          className="p-4 cursor-pointer"
          onClick={() => handleOpenOrderDetail(order)}
        >
          {/* Header Row: Order number, Timer */}
          <div className="flex items-center justify-between mb-3 pr-6">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                {getOrderTypeIcon(order.order_type)}
              </span>
              <span className="font-bold text-base text-foreground">
                Pedido {getOrderDisplayNumber(order)}
              </span>
            </div>
            
            {/* Timer Badge with time */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              timer?.isStopped
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700'
                : timer?.isOverdue 
                  ? 'bg-destructive/10 text-destructive border-destructive/30' 
                  : timer && timer.percentage > 75
                    ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700'
                    : 'bg-muted text-muted-foreground border-border'
            }`}>
              <Clock className="w-3 h-3" />
              <span className="font-mono font-semibold">
                {timer ? formatElapsedTimeWithSeconds(timer.elapsedSeconds) : formatTime(order.created_at)}
              </span>
            </div>
          </div>

          {/* Delayed Status Badge */}
          {delayed && order.status === 'preparing' && (
            <div className="order-status-bar delayed mb-3">
              Pedido atrasado
            </div>
          )}

          {/* Customer Name and Total Row */}
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground truncate max-w-[160px]">
              {order.customer_name || 'Não identificado'}
            </span>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">Total:</span>
              <span className="font-bold text-base ml-2">{formatCurrency(order.total)}</span>
            </div>
          </div>

          {/* Payment status for ready orders */}
          {(order.status === 'ready' || order.status === 'served') && !order.payment_method && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <span>💳 Não registrado</span>
            </div>
          )}

          {/* Waiter info */}
          {waiterName && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 mb-2">
              <ChefHat className="w-3 h-3" />
              <span className="truncate">{waiterName}</span>
            </div>
          )}

          {/* Table or Tab location badge */}
          {locationInfo && (
            <div className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg ${
              locationInfo.type === 'table' 
                ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700' 
                : 'text-violet-700 bg-violet-100 dark:text-violet-300 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700'
            }`}>
              <UtensilsCrossed className="w-4 h-4" />
              {locationInfo.label}
            </div>
          )}

          {/* Order type badge for non-table orders */}
          {order.order_type && order.order_type !== 'table' && !locationInfo && (
            <Badge variant="outline" className="text-xs h-6 px-2">
              {getOrderTypeIcon(order.order_type)}
              <span className="ml-1">{getOrderTypeLabel(order.order_type)}</span>
            </Badge>
          )}
        </div>

        {/* Timer Progress Bar for preparing */}
        {timer && order.status === 'preparing' && !delayed && (
          <div className="px-4 pb-3">
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${
                  timer.percentage > 75 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(timer.percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Driver selector for delivery orders */}
        {order.order_type === 'delivery' && (
          <div 
            className="px-4 pb-3 space-y-2" 
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button 
                  className={`w-full h-9 px-3 justify-between text-sm inline-flex items-center rounded-lg border bg-background font-medium ${
                    order.driver_id 
                      ? 'border-blue-500 text-blue-600 bg-blue-50' 
                      : 'border-dashed border-input'
                  }`}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <span className="flex items-center gap-2">
                    <Bike className="w-4 h-4" />
                    {order.driver_id ? getDriverName(order.driver_id) : 'Selecionar motoboy'}
                  </span>
                  <ChevronDown className="w-4 h-4" />
                </button>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOrderDriver(order.id, driver.id, order);
                        }}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            updateOrderDriver(order.id, null);
                          }}
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
                className="flex items-center gap-2 text-xs text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg transition-colors font-medium"
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
            className="px-4 py-2 border-t text-xs text-muted-foreground cursor-pointer bg-muted/30"
            onClick={() => handleOpenOrderDetail(order)}
          >
            {order.order_items.slice(0, 2).map((item) => (
              <div key={item.id} className="truncate">
                {item.quantity}x {item.product_name}
              </div>
            ))}
            {order.order_items.length > 2 && (
              <div className="text-primary font-medium">+{order.order_items.length - 2} mais itens</div>
            )}
          </div>
        )}

        {/* Delivery Status Dropdown */}
        {order.order_type === 'delivery' && order.status !== 'pending' && (
          <div 
            className="px-4 pb-3" 
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button 
                  className={`w-full h-9 px-3 justify-between text-sm inline-flex items-center rounded-lg border bg-background font-medium ${
                    order.status === 'out_for_delivery' 
                      ? 'border-blue-500 text-blue-600 bg-blue-50' 
                      : 'border-input'
                  }`}
                  onPointerDown={(e) => e.stopPropagation()}
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
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[180px]">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'preparing'); }}>
                  🔥 Preparando
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'ready'); }}>
                  ✅ Pronto
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'out_for_delivery'); }}>
                  <Truck className="w-4 h-4 mr-2" />
                  Em entrega
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'delivered'); }}
                  className="text-green-600"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finalizado
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Close Table/Tab Button - Main action for ready/served orders */}
        {showCloseButton && locationInfo && (
          <div 
            className="px-4 pb-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold h-10 text-sm rounded-lg flex items-center justify-center gap-2 transition-colors"
              onClick={() => handleCloseTableFromOrder(order)}
            >
              Fechar {locationInfo.type === 'table' ? 'mesa' : 'comanda'} →
            </button>
          </div>
        )}

        {/* Action buttons for non-delivery, non-table/tab orders */}
        {showAdvanceButton && order.order_type !== 'delivery' && !showCloseButton && (
          <div 
            className="px-4 pb-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="w-full h-10 text-sm border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-lg flex items-center justify-center gap-2 bg-background font-semibold transition-colors"
              onClick={() => {
                const nextStatus = order.status === 'pending' 
                  ? 'preparing' 
                  : order.status === 'preparing' 
                    ? 'ready' 
                    : 'served';
                updateOrderStatus(order.id, nextStatus);
              }}
            >
              {order.status === 'ready' ? 'Marcar servido' : 'Avançar'} →
            </button>
          </div>
        )}

        {/* Advance button for delivery in pending status */}
        {order.order_type === 'delivery' && order.status === 'pending' && (
          <div 
            className="px-4 pb-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="w-full h-10 text-sm border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-lg flex items-center justify-center gap-2 bg-background font-semibold transition-colors"
              onClick={() => updateOrderStatus(order.id, 'preparing')}
            >
              Aceitar →
            </button>
          </div>
        )}

        {/* Finalize button - only for counter/takeaway orders (not table/tab) */}
        {showFinalizeButton && (order.order_type === 'counter' || order.order_type === 'takeaway') && !order.table_id && !order.tab_id && (
          <div 
            className="px-4 pb-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="w-full h-10 text-sm border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white rounded-lg flex items-center justify-center gap-2 bg-background font-semibold transition-colors"
              onClick={() => updateOrderStatus(order.id, 'delivered')}
            >
              <CheckCircle className="w-4 h-4" />
              Produto Entregue
            </button>
          </div>
        )}

        {/* Mark as served button - for table/tab orders in ready status */}
        {showFinalizeButton && (order.table_id || order.tab_id) && order.status === 'ready' && (
          <div 
            className="px-4 pb-4" 
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="w-full h-10 text-sm border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white rounded-lg flex items-center justify-center gap-2 bg-background font-semibold transition-colors"
              onClick={() => updateOrderStatus(order.id, 'served')}
            >
              <CheckCircle className="w-4 h-4" />
              Marcar como servido
            </button>
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

  return (
    <DashboardLayout>
      <AnimatePresence mode="wait">
        {loading ? (
          <DashboardSkeleton key="skeleton" />
        ) : (
          <DashboardContent key="content">
        {/* Premium Header */}
        <DashboardHeader
          isStoreOpen={isStoreOpen}
          restaurantName={restaurant?.name || ''}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={filter}
          onFilterChange={setFilter}
          orderCounts={orderCounts}
          isCompactMode={isCompactMode}
          onCompactModeToggle={() => setIsCompactMode(!isCompactMode)}
          soundEnabled={soundEnabled}
          onSoundToggle={toggleSound}
          notificationCount={notifications.length}
          onNewOrder={() => {
            setNewOrderInitialType(undefined);
            setShowNewOrderModal(true);
          }}
          onPrintSettings={() => setShowPrintSettingsModal(true)}
          onStoreControl={() => setShowStoreControlModal(true)}
        />

        {/* Kanban Board with DnD */}
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 min-h-0 overflow-hidden p-4 flex gap-4">
            {/* Premium Kanban Columns */}
            <div className="flex-1 h-full flex gap-4 overflow-x-auto min-w-0 pb-2">
              {/* Column: Em análise */}
              <KanbanColumn
                id="column-pending"
                title="Em análise"
                count={pendingOrders.length}
                variant="analysis"
                emptyIcon={<span className="text-4xl">↩️</span>}
                emptyMessage={autoAccept ? 'Pedidos aceitos automaticamente' : 'Sem pedidos pendentes'}
                headerContent={
                  <div className="p-3 bg-orange-50/80 dark:bg-orange-950/20">
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <p className="flex items-center justify-between">
                        <span><span className="font-semibold text-foreground">Balcão:</span> {prepTimes.counter_min}-{prepTimes.counter_max}min</span>
                        <button 
                          className="text-primary hover:underline font-medium"
                          onClick={() => setShowPrepTimeModal(true)}
                        >
                          Editar
                        </button>
                      </p>
                      <p><span className="font-semibold text-foreground">Delivery:</span> {prepTimes.delivery_min}-{prepTimes.delivery_max}min</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-orange-200/50 dark:border-orange-800/50">
                      <Switch checked={autoAccept} onCheckedChange={setAutoAccept} />
                      <span className="text-xs font-medium">Auto-aceitar</span>
                    </div>
                  </div>
                }
              >
                {pendingOrders.length > 0 && (
                  <VirtualizedColumn
                    items={pendingOrders}
                    renderItem={(order) => (
                      <DraggableOrderCard key={order.id} order={order} showAdvanceButton />
                    )}
                    getItemKey={(order) => order.id}
                    estimateSize={isCompactMode ? 80 : 180}
                  />
                )}
              </KanbanColumn>

              {/* Column: Em produção */}
              <KanbanColumn
                id="column-preparing"
                title="Em produção"
                count={preparingOrders.length}
                variant="production"
                hasDelayed={preparingOrders.some(o => isDelayed(o))}
                emptyIcon={<ChefHat className="w-10 h-10" />}
                emptyMessage="Nenhum pedido em produção"
              >
                {preparingOrders.length > 0 && (
                  <VirtualizedColumn
                    items={preparingOrders}
                    renderItem={(order) => (
                      <DraggableOrderCard key={order.id} order={order} showAdvanceButton />
                    )}
                    getItemKey={(order) => order.id}
                    estimateSize={isCompactMode ? 80 : 180}
                  />
                )}
              </KanbanColumn>

              {/* Column: Prontos */}
              <KanbanColumn
                id="column-ready"
                title="Prontos"
                count={readyOrders.length}
                variant="ready"
                emptyIcon={<UtensilsCrossed className="w-10 h-10" />}
                emptyMessage="Nenhum pedido pronto"
                headerAction={
                  readyOrders.length > 0 ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-6 text-xs px-2 bg-white/90 text-emerald-700 border-white/40 hover:bg-white font-semibold"
                      onClick={handleFinalizeAllReady}
                    >
                      Finalizar todos
                    </Button>
                  ) : undefined
                }
              >
                {readyOrders.length > 0 && (
                  <VirtualizedColumn
                    items={readyOrders}
                    renderItem={(order) => (
                      <DraggableOrderCard key={order.id} order={order} showFinalizeButton />
                    )}
                    getItemKey={(order) => order.id}
                    estimateSize={isCompactMode ? 80 : 180}
                  />
                )}
              </KanbanColumn>

              {/* Column: Servidos */}
              {servedOrders.length > 0 && (
                <KanbanColumn
                  id="served"
                  title="Servidos"
                  count={servedOrders.length}
                  variant="served"
                >
                  <VirtualizedColumn
                    items={servedOrders}
                    renderItem={(order) => (
                      <DraggableOrderCard key={order.id} order={order} />
                    )}
                    getItemKey={(order) => order.id}
                    estimateSize={isCompactMode ? 80 : 180}
                  />
                </KanbanColumn>
              )}
            </div>

            {/* Right Sidebar - Quick Stats */}
            <div className="w-14 flex-shrink-0 flex flex-col gap-2">
              <div className="bg-card border rounded-xl p-2 flex flex-col items-center gap-1 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-lg font-bold text-foreground">
                  {orders.filter(o => o.table_id && !['delivered', 'cancelled'].includes(o.status || '')).reduce((acc, o) => {
                    if (!acc.includes(o.table_id!)) acc.push(o.table_id!);
                    return acc;
                  }, [] as string[]).length}
                </span>
                <span className="text-[9px] text-muted-foreground font-medium">Mesas</span>
              </div>

              <div className="bg-card border rounded-xl p-2 flex flex-col items-center gap-1 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="text-lg font-bold text-foreground">
                  {orders.filter(o => o.tab_id && !['delivered', 'cancelled'].includes(o.status || '')).reduce((acc, o) => {
                    if (!acc.includes(o.tab_id!)) acc.push(o.tab_id!);
                    return acc;
                  }, [] as string[]).length}
                </span>
                <span className="text-[9px] text-muted-foreground font-medium">Comandas</span>
              </div>

              <div className="bg-card border rounded-xl p-2 flex flex-col items-center gap-1 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Bike className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-lg font-bold text-foreground">
                  {orders.filter(o => o.order_type === 'delivery' && !['delivered', 'cancelled'].includes(o.status || '')).length}
                </span>
                <span className="text-[9px] text-muted-foreground font-medium">Delivery</span>
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
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
          </DashboardContent>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
