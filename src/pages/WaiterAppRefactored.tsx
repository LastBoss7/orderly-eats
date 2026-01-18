import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePrintSettings } from '@/hooks/usePrintSettings';
import { usePrintToElectron } from '@/hooks/usePrintToElectron';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// Modular imports
import { 
  WaiterPinLogin,
  TableActionModal,
  SizeModal,
  PaymentModal,
} from './waiter/components';
import { TablesViewRefactored } from './waiter/views/TablesViewRefactored';
import { OrderViewRefactored } from './waiter/views/OrderViewRefactored';
import { DeliveryViewRefactored } from './waiter/views/DeliveryViewRefactored';
import { TableOrdersView } from './waiter/views/TableOrdersView';
import { TabOrdersView } from './waiter/views/TabOrdersView';
import { 
  Waiter, 
  Table, 
  Tab, 
  Category, 
  Product, 
  Order,
  Customer,
  CartItem,
  ProductSize,
  DeliveryForm,
  formatCurrency,
  getProductPrice,
  getSizeLabel,
} from './waiter/types';

interface ExternalRestaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface WaiterAppProps {
  externalWaiter?: Waiter;
  externalRestaurant?: ExternalRestaurant;
  onExternalLogout?: () => void;
}

type AppView = 'login' | 'tables' | 'order' | 'delivery' | 'delivery-order' | 'table-orders' | 'tab-orders';
type OrderMode = 'table' | 'delivery' | 'takeaway' | 'tab';
type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';

export default function WaiterAppRefactored({ 
  externalWaiter, 
  externalRestaurant, 
  onExternalLogout 
}: WaiterAppProps = {}) {
  const { restaurant: authRestaurant, signOut } = useAuth();
  const restaurant = externalRestaurant || authRestaurant;
  const { shouldAutoPrint } = usePrintSettings();
  const { printConference, reprintOrder } = usePrintToElectron({ restaurantId: restaurant?.id });
  const isPublicAccess = !!externalRestaurant;

  // Core states
  const [view, setView] = useState<AppView>(externalWaiter ? 'tables' : 'login');
  const [selectedWaiter, setSelectedWaiter] = useState<Waiter | null>(externalWaiter || null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [tables, setTables] = useState<Table[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tableReadyOrders, setTableReadyOrders] = useState<Record<string, boolean>>({});

  // Selection states
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTab, setSelectedTab] = useState<Tab | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Cart states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderMode, setOrderMode] = useState<OrderMode>('table');

  // Modal states
  const [showTableModal, setShowTableModal] = useState(false);
  const [modalTable, setModalTable] = useState<Table | null>(null);
  const [tableTotal, setTableTotal] = useState(0);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [sizeModalProduct, setSizeModalProduct] = useState<Product | null>(null);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState(0);
  const [closingTable, setClosingTable] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Delivery form
  const [deliveryForm, setDeliveryForm] = useState<DeliveryForm>({
    customerName: '',
    customerPhone: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    cep: '',
    deliveryFee: 0,
  });

  // Tab customer states
  const [showTabCustomerModal, setShowTabCustomerModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const [tabCustomerName, setTabCustomerName] = useState('');
  const [tabCustomerPhone, setTabCustomerPhone] = useState('');
  const [savingTabCustomer, setSavingTabCustomer] = useState(false);

  // Create tab modal
  const [showCreateTabModal, setShowCreateTabModal] = useState(false);
  const [newTabCustomerName, setNewTabCustomerName] = useState('');
  const [newTabCustomerPhone, setNewTabCustomerPhone] = useState('');
  const [creatingTab, setCreatingTab] = useState(false);

  // ========== DATA FETCHING ==========
  
  const fetchInitialData = useCallback(async () => {
    if (!restaurant?.id) return;

    try {
      const [tablesRes, tabsRes, categoriesRes, productsRes] = await Promise.all([
        supabase.from('tables').select('*').eq('restaurant_id', restaurant.id).order('number'),
        supabase.from('tabs').select('*').eq('restaurant_id', restaurant.id).order('number'),
        supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order'),
        supabase.from('products').select('*').eq('restaurant_id', restaurant.id).eq('is_available', true).order('name'),
      ]);

      setTables((tablesRes.data || []) as Table[]);
      setTabs((tabsRes.data || []) as Tab[]);
      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  const fetchTableTotal = useCallback(async (tableId: string): Promise<number> => {
    if (!restaurant?.id) return 0;
    
    const { data } = await supabase
      .from('orders')
      .select('total')
      .eq('table_id', tableId)
      .in('status', ['pending', 'preparing', 'ready']);
    
    return (data || []).reduce((sum, o) => sum + (o.total || 0), 0);
  }, [restaurant?.id]);

  const fetchTableOrders = useCallback(async (tableId: string) => {
    setLoadingOrders(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*), waiters(id, name)')
        .eq('table_id', tableId)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: false });
      
      setTableOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const fetchTabOrders = useCallback(async (tabId: string) => {
    setLoadingOrders(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*), waiters(id, name)')
        .eq('tab_id', tabId)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: false });
      
      setTableOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const refreshReadyOrders = useCallback(async () => {
    if (!restaurant?.id) return;
    
    const { data } = await supabase
      .from('orders')
      .select('table_id')
      .eq('restaurant_id', restaurant.id)
      .eq('status', 'ready');
    
    const readyMap: Record<string, boolean> = {};
    data?.forEach((order) => {
      if (order.table_id) readyMap[order.table_id] = true;
    });
    setTableReadyOrders(readyMap);
  }, [restaurant?.id]);

  // ========== EFFECTS ==========

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    refreshReadyOrders();
    const interval = setInterval(refreshReadyOrders, 5000);
    return () => clearInterval(interval);
  }, [refreshReadyOrders]);

  // Realtime subscription for authenticated access
  useEffect(() => {
    if (!restaurant?.id || isPublicAccess) return;

    const channel = supabase
      .channel('waiter-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, async () => {
        const { data } = await supabase.from('tables').select('*').eq('restaurant_id', restaurant.id).order('number');
        setTables((data || []) as Table[]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tabs' }, async () => {
        const { data } = await supabase.from('tabs').select('*').eq('restaurant_id', restaurant.id).order('number');
        setTabs((data || []) as Tab[]);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => refreshReadyOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurant?.id, isPublicAccess, refreshReadyOrders]);

  // Polling for public access
  useEffect(() => {
    if (!restaurant?.id || !isPublicAccess) return;

    const pollData = async () => {
      const [tablesRes, tabsRes] = await Promise.all([
        supabase.from('tables').select('*').eq('restaurant_id', restaurant.id).order('number'),
        supabase.from('tabs').select('*').eq('restaurant_id', restaurant.id).order('number'),
      ]);
      setTables((tablesRes.data || []) as Table[]);
      setTabs((tabsRes.data || []) as Tab[]);
      await refreshReadyOrders();
    };

    const interval = setInterval(pollData, 5000);
    return () => clearInterval(interval);
  }, [restaurant?.id, isPublicAccess, refreshReadyOrders]);

  // ========== HANDLERS ==========

  const handlePinLogin = async (waiter: Waiter) => {
    setSelectedWaiter(waiter);
    setView('tables');
    toast.success(`Bem-vindo, ${waiter.name}!`);
  };

  const handleLogout = () => {
    if (onExternalLogout) {
      onExternalLogout();
    } else {
      signOut();
    }
  };

  const handleTableClick = async (table: Table) => {
    setModalTable(table);
    const total = await fetchTableTotal(table.id);
    setTableTotal(total);
    setShowTableModal(true);
  };

  const handleNewOrder = (table: Table) => {
    setSelectedTable(table);
    setOrderMode('table');
    setShowTableModal(false);
    setView('order');
    setCart([]);
    setOrderNotes('');
  };

  const handleViewOrders = async (table: Table) => {
    setSelectedTable(table);
    setShowTableModal(false);
    await fetchTableOrders(table.id);
    setView('table-orders');
  };

  const handleTabClick = (tab: Tab) => {
    if (tab.status === 'available') {
      setPendingTab(tab);
      setTabCustomerName('');
      setTabCustomerPhone('');
      setShowTabCustomerModal(true);
    } else {
      setSelectedTab(tab);
      fetchTabOrders(tab.id);
      setView('tab-orders');
    }
  };

  const handleSaveTabCustomer = async () => {
    if (!pendingTab || !tabCustomerName.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    setSavingTabCustomer(true);
    try {
      const { error } = await supabase
        .from('tabs')
        .update({ 
          customer_name: tabCustomerName.trim(),
          customer_phone: tabCustomerPhone.trim() || null,
          status: 'occupied'
        })
        .eq('id', pendingTab.id);

      if (error) throw error;

      setTabs(prev => prev.map(t => 
        t.id === pendingTab.id 
          ? { ...t, customer_name: tabCustomerName.trim(), customer_phone: tabCustomerPhone.trim() || null, status: 'occupied' as const }
          : t
      ));

      setSelectedTab({
        ...pendingTab,
        customer_name: tabCustomerName.trim(),
        customer_phone: tabCustomerPhone.trim() || null,
        status: 'occupied'
      });
      setOrderMode('tab');
      setView('order');
      setCart([]);
      setOrderNotes('');
      
      setShowTabCustomerModal(false);
      setPendingTab(null);
      
      toast.success(`Comanda #${pendingTab.number} aberta para ${tabCustomerName.trim()}`);
    } catch (error: any) {
      console.error('Error saving tab customer:', error);
      toast.error('Erro ao salvar cliente na comanda');
    } finally {
      setSavingTabCustomer(false);
    }
  };

  const handleCreateNewTab = async () => {
    if (!restaurant?.id) return;
    if (!newTabCustomerName.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    setCreatingTab(true);
    try {
      const maxNumber = tabs.length > 0 ? Math.max(...tabs.map(t => t.number)) : 0;
      const nextNumber = maxNumber + 1;

      const { data: newTab, error } = await supabase
        .from('tabs')
        .insert({
          restaurant_id: restaurant.id,
          number: nextNumber,
          customer_name: newTabCustomerName.trim(),
          customer_phone: newTabCustomerPhone.trim() || null,
          status: 'occupied'
        })
        .select()
        .single();

      if (error) throw error;

      const createdTab: Tab = {
        id: newTab.id,
        number: newTab.number,
        customer_name: newTab.customer_name,
        customer_phone: newTab.customer_phone,
        status: 'occupied'
      };
      setTabs(prev => [...prev, createdTab]);

      setSelectedTab(createdTab);
      setOrderMode('tab');
      setView('order');
      setCart([]);
      setOrderNotes('');
      
      setShowCreateTabModal(false);
      setNewTabCustomerName('');
      setNewTabCustomerPhone('');
      
      toast.success(`Comanda #${nextNumber} criada para ${newTabCustomerName.trim()}`);
    } catch (error: any) {
      console.error('Error creating tab:', error);
      toast.error('Erro ao criar comanda');
    } finally {
      setCreatingTab(false);
    }
  };

  const handleStartDelivery = (mode: 'delivery' | 'takeaway') => {
    setOrderMode(mode);
    setView('delivery');
    setCart([]);
    setOrderNotes('');
    setDeliveryForm({
      customerName: '',
      customerPhone: '',
      address: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      cep: '',
      deliveryFee: 0,
    });
    setSelectedCustomer(null);
    setCustomers([]);
  };

  const handleProductClick = (product: Product) => {
    if (product.has_sizes) {
      setSizeModalProduct(product);
    } else {
      addToCart(product, null);
    }
  };

  const addToCart = (product: Product, size: ProductSize | null) => {
    const unitPrice = getProductPrice(product, size);
    
    setCart(prev => {
      const existing = prev.find(item => 
        item.product.id === product.id && item.size === size
      );
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id && item.size === size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, notes: '', size, unitPrice }];
    });
    setSizeModalProduct(null);
  };

  const updateQuantity = (productId: string, size: ProductSize | null | undefined, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId && item.size === size) {
            const newQuantity = item.quantity + delta;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const updateItemNotes = (productId: string, size: ProductSize | null | undefined, notes: string) => {
    setCart(prev => prev.map(item =>
      item.product.id === productId && item.size === size ? { ...item, notes } : item
    ));
  };

  const removeFromCart = (productId: string, size: ProductSize | null | undefined) => {
    setCart(prev => prev.filter(item => 
      !(item.product.id === productId && item.size === size)
    ));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const orderTotal = cartTotal + (orderMode === 'delivery' ? deliveryForm.deliveryFee : 0);
  const tableOrdersTotal = tableOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  const handleSubmitOrder = async () => {
    setSubmitting(true);

    try {
      let fullAddress = '';
      if (orderMode === 'delivery') {
        const addressParts = [
          deliveryForm.address,
          deliveryForm.number && `Nº ${deliveryForm.number}`,
          deliveryForm.complement,
          deliveryForm.neighborhood,
          deliveryForm.city,
          deliveryForm.cep && `CEP: ${deliveryForm.cep}`,
        ].filter(Boolean);
        fullAddress = addressParts.join(', ');
      }

      let customerId = selectedCustomer?.id || null;
      if ((orderMode === 'delivery' || orderMode === 'takeaway') && !selectedCustomer && !isPublicAccess) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            restaurant_id: restaurant?.id,
            name: deliveryForm.customerName.trim(),
            phone: deliveryForm.customerPhone.trim(),
            address: deliveryForm.address.trim() || null,
            number: deliveryForm.number.trim() || null,
            complement: deliveryForm.complement.trim() || null,
            neighborhood: deliveryForm.neighborhood.trim() || null,
            city: deliveryForm.city.trim() || null,
            cep: deliveryForm.cep.trim() || null,
          })
          .select()
          .single();

        if (!customerError && newCustomer) {
          customerId = newCustomer.id;
        }
      }

      const orderItems = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.size 
          ? `${item.product.name} (${getSizeLabel(item.size)})`
          : item.product.name,
        product_price: item.unitPrice,
        quantity: item.quantity,
        notes: item.notes || null,
        product_size: item.size || null,
        category_id: item.product.category_id,
        restaurant_id: restaurant?.id,
      }));

      const { data: orderResult, error: orderError } = await supabase.rpc('get_next_order_number', { 
        _restaurant_id: restaurant?.id 
      });
      
      const orderNumber = orderResult || 1;

      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant?.id,
          table_id: orderMode === 'table' ? selectedTable?.id : null,
          tab_id: orderMode === 'tab' ? selectedTab?.id : null,
          order_type: orderMode === 'tab' ? 'table' : orderMode,
          order_number: orderNumber,
          print_status: 'pending',
          total: orderTotal,
          notes: orderNotes || null,
          customer_id: customerId,
          customer_name: orderMode === 'tab' ? selectedTab?.customer_name : (orderMode !== 'table' ? deliveryForm.customerName : null),
          delivery_address: orderMode === 'delivery' ? fullAddress : null,
          delivery_phone: orderMode !== 'table' && orderMode !== 'tab' ? deliveryForm.customerPhone : null,
          delivery_fee: orderMode === 'delivery' ? deliveryForm.deliveryFee : 0,
          waiter_id: selectedWaiter?.id || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Insert order items
      const itemsWithOrderId = orderItems.map(item => ({
        ...item,
        order_id: newOrder.id,
      }));

      await supabase.from('order_items').insert(itemsWithOrderId);

      // Update table/tab status if needed
      if (orderMode === 'table' && selectedTable) {
        await supabase.from('tables').update({ status: 'occupied' }).eq('id', selectedTable.id);
      }

      const successMessage = orderMode === 'table'
        ? `Pedido da Mesa ${selectedTable?.number} enviado!`
        : orderMode === 'tab'
          ? `Pedido da Comanda #${selectedTab?.number} enviado!`
          : orderMode === 'delivery'
            ? `Pedido delivery para ${deliveryForm.customerName} enviado!`
            : `Pedido para levar de ${deliveryForm.customerName} enviado!`;

      toast.success(successMessage);

      // Refresh data
      const [tablesRes, tabsRes] = await Promise.all([
        supabase.from('tables').select('*').eq('restaurant_id', restaurant?.id).order('number'),
        supabase.from('tabs').select('*').eq('restaurant_id', restaurant?.id).order('number'),
      ]);
      setTables((tablesRes.data || []) as Table[]);
      setTabs((tabsRes.data || []) as Tab[]);

      setView('tables');
      setSelectedTable(null);
      setSelectedTab(null);
      setCart([]);
      setOrderNotes('');
      setDeliveryForm({
        customerName: '',
        customerPhone: '',
        address: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        cep: '',
        deliveryFee: 0,
      });
      setSelectedCustomer(null);
    } catch (error: any) {
      toast.error('Erro ao enviar pedido: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTable = async () => {
    if (!selectedTable) return;
    
    setClosingTable(true);
    try {
      await supabase
        .from('orders')
        .update({ 
          status: 'closed', 
          closed_at: new Date().toISOString(),
          payment_method: paymentMethod,
          cash_received: paymentMethod === 'cash' ? cashReceived : null,
          change_given: paymentMethod === 'cash' && cashReceived > tableOrdersTotal ? cashReceived - tableOrdersTotal : null,
        })
        .in('id', tableOrders.map(o => o.id));
      
      await supabase.from('tables').update({ status: 'available' }).eq('id', selectedTable.id);
      
      toast.success(`Mesa ${selectedTable.number} fechada com sucesso!`);
      setShowCloseModal(false);
      setView('tables');
      setSelectedTable(null);
      setTableOrders([]);
      
      const { data } = await supabase.from('tables').select('*').eq('restaurant_id', restaurant?.id).order('number');
      setTables((data || []) as Table[]);
    } catch (error: any) {
      toast.error('Erro ao fechar mesa');
    } finally {
      setClosingTable(false);
    }
  };

  const handleCloseTab = async () => {
    if (!selectedTab) return;
    
    setClosingTable(true);
    try {
      await supabase
        .from('orders')
        .update({ 
          status: 'closed', 
          closed_at: new Date().toISOString(),
          payment_method: paymentMethod,
          cash_received: paymentMethod === 'cash' ? cashReceived : null,
          change_given: paymentMethod === 'cash' && cashReceived > tableOrdersTotal ? cashReceived - tableOrdersTotal : null,
        })
        .in('id', tableOrders.map(o => o.id));
      
      await supabase.from('tabs').update({ status: 'available', customer_name: null, customer_phone: null }).eq('id', selectedTab.id);
      
      toast.success(`Comanda #${selectedTab.number} fechada com sucesso!`);
      setShowCloseModal(false);
      setView('tables');
      setSelectedTab(null);
      setTableOrders([]);
      
      const { data } = await supabase.from('tabs').select('*').eq('restaurant_id', restaurant?.id).order('number');
      setTabs((data || []) as Tab[]);
    } catch (error: any) {
      toast.error('Erro ao fechar comanda');
    } finally {
      setClosingTable(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!selectedTable && !selectedTab) return;
    
    const total = tableOrdersTotal;
    const allItems = tableOrders.flatMap(o => o.order_items || []);
    
    try {
      await printConference({
        entityType: selectedTable ? 'table' : 'tab',
        entityNumber: selectedTable?.number || selectedTab?.number || 0,
        customerName: selectedTab?.customer_name || null,
        items: allItems.map(item => ({
          product_name: item.product_name,
          quantity: item.quantity,
          product_price: item.product_price,
        })),
        total: total,
        splitCount: 1,
      });
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('Erro ao imprimir conferência');
    }
  };

  // ========== RENDER ==========

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center bg-background"
      >
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </motion.div>
    );
  }

  // Login View
  if (view === 'login') {
    return (
      <WaiterPinLogin
        restaurantId={restaurant?.id || ''}
        restaurantName={restaurant?.name || ''}
        onLogin={handlePinLogin}
        onBack={handleLogout}
      />
    );
  }

  // Tables View
  if (view === 'tables') {
    return (
      <>
        <TablesViewRefactored
          waiter={selectedWaiter!}
          restaurantName={restaurant?.name || ''}
          tables={tables}
          tabs={tabs}
          tableReadyOrders={tableReadyOrders}
          onTableClick={handleTableClick}
          onTabClick={handleTabClick}
          onStartDelivery={() => handleStartDelivery('delivery')}
          onStartTakeaway={() => handleStartDelivery('takeaway')}
          onCreateTab={() => {
            setNewTabCustomerName('');
            setNewTabCustomerPhone('');
            setShowCreateTabModal(true);
          }}
          onLogout={handleLogout}
          showTabCustomerModal={showTabCustomerModal}
          pendingTab={pendingTab}
          tabCustomerName={tabCustomerName}
          tabCustomerPhone={tabCustomerPhone}
          savingTabCustomer={savingTabCustomer}
          onTabCustomerNameChange={setTabCustomerName}
          onTabCustomerPhoneChange={setTabCustomerPhone}
          onSaveTabCustomer={handleSaveTabCustomer}
          onCloseTabCustomerModal={() => {
            setShowTabCustomerModal(false);
            setPendingTab(null);
          }}
          showCreateTabModal={showCreateTabModal}
          newTabCustomerName={newTabCustomerName}
          newTabCustomerPhone={newTabCustomerPhone}
          creatingTab={creatingTab}
          onNewTabCustomerNameChange={setNewTabCustomerName}
          onNewTabCustomerPhoneChange={setNewTabCustomerPhone}
          onCreateNewTab={handleCreateNewTab}
          onCloseCreateTabModal={() => setShowCreateTabModal(false)}
        />

        {/* Table Action Modal */}
        <AnimatePresence>
          {showTableModal && modalTable && (
            <TableActionModal
              table={modalTable}
              total={tableTotal}
              onViewOrders={() => handleViewOrders(modalTable)}
              onPrintReceipt={() => {
                handleViewOrders(modalTable);
                setTimeout(handlePrintReceipt, 500);
              }}
              onCloseTable={async () => {
                await handleViewOrders(modalTable);
                setTableTotal(tableTotal);
                setShowCloseModal(true);
              }}
              onNewOrder={() => handleNewOrder(modalTable)}
              onClose={() => setShowTableModal(false)}
            />
          )}
        </AnimatePresence>

        {/* Size Modal */}
        {sizeModalProduct && (
          <SizeModal
            product={sizeModalProduct}
            onSelectSize={(size) => addToCart(sizeModalProduct, size)}
            onClose={() => setSizeModalProduct(null)}
          />
        )}
      </>
    );
  }

  // Order View
  if (view === 'order') {
    return (
      <>
        <OrderViewRefactored
          orderMode={orderMode}
          table={selectedTable}
          tab={selectedTab}
          deliveryForm={deliveryForm}
          categories={categories}
          products={products}
          cart={cart}
          orderNotes={orderNotes}
          submitting={submitting}
          onBack={() => setView('tables')}
          onProductClick={handleProductClick}
          onUpdateQuantity={updateQuantity}
          onUpdateItemNotes={updateItemNotes}
          onRemoveFromCart={removeFromCart}
          onOrderNotesChange={setOrderNotes}
          onSubmitOrder={handleSubmitOrder}
        />

        {/* Size Modal */}
        {sizeModalProduct && (
          <SizeModal
            product={sizeModalProduct}
            onSelectSize={(size) => addToCart(sizeModalProduct, size)}
            onClose={() => setSizeModalProduct(null)}
          />
        )}
      </>
    );
  }

  // Delivery Form View
  if (view === 'delivery') {
    return (
      <DeliveryViewRefactored
        orderMode={orderMode as 'delivery' | 'takeaway'}
        deliveryForm={deliveryForm}
        customers={customers}
        onBack={() => setView('tables')}
        onDeliveryFormChange={setDeliveryForm}
        onSelectCustomer={(customer) => {
          setSelectedCustomer(customer);
          setDeliveryForm({
            ...deliveryForm,
            customerName: customer.name,
            customerPhone: customer.phone,
            address: customer.address || '',
            number: customer.number || '',
            complement: customer.complement || '',
            neighborhood: customer.neighborhood || '',
            city: customer.city || '',
            cep: customer.cep || '',
          });
          setCustomers([]);
        }}
        onSearchCustomers={async (term) => {
          if (!restaurant?.id || term.length < 3) {
            setCustomers([]);
            return;
          }
          const { data } = await supabase
            .from('customers')
            .select('*')
            .eq('restaurant_id', restaurant.id)
            .or(`phone.ilike.%${term}%,name.ilike.%${term}%`)
            .limit(5);
          setCustomers((data || []) as Customer[]);
        }}
        onProceed={() => setView('delivery-order')}
      />
    );
  }

  // Delivery Order View
  if (view === 'delivery-order') {
    return (
      <>
        <OrderViewRefactored
          orderMode={orderMode}
          table={null}
          tab={null}
          deliveryForm={deliveryForm}
          categories={categories}
          products={products}
          cart={cart}
          orderNotes={orderNotes}
          submitting={submitting}
          onBack={() => setView('delivery')}
          onProductClick={handleProductClick}
          onUpdateQuantity={updateQuantity}
          onUpdateItemNotes={updateItemNotes}
          onRemoveFromCart={removeFromCart}
          onOrderNotesChange={setOrderNotes}
          onSubmitOrder={handleSubmitOrder}
        />

        {sizeModalProduct && (
          <SizeModal
            product={sizeModalProduct}
            onSelectSize={(size) => addToCart(sizeModalProduct, size)}
            onClose={() => setSizeModalProduct(null)}
          />
        )}
      </>
    );
  }

  // Table Orders View
  if (view === 'table-orders' && selectedTable) {
    return (
      <>
        <TableOrdersView
          table={selectedTable}
          orders={tableOrders}
          loading={loadingOrders}
          onBack={() => {
            setView('tables');
            setSelectedTable(null);
            setTableOrders([]);
          }}
          onNewOrder={() => handleNewOrder(selectedTable)}
          onPrintReceipt={handlePrintReceipt}
          onCloseTable={() => {
            setTableTotal(tableOrdersTotal);
            setShowCloseModal(true);
          }}
          onReprintOrder={async (order) => {
            try {
              await reprintOrder({
                orderId: order.id,
                orderNumber: order.order_number,
              });
            } catch (error) {
              console.error('Error reprinting order:', error);
              toast.error('Erro ao reimprimir pedido');
            }
          }}
        />

        {/* Payment Modal */}
        {showCloseModal && (
          <PaymentModal
            total={tableOrdersTotal}
            paymentMethod={paymentMethod}
            cashReceived={cashReceived}
            isClosing={closingTable}
            onPaymentMethodChange={setPaymentMethod}
            onCashReceivedChange={setCashReceived}
            onConfirm={handleCloseTable}
            onClose={() => setShowCloseModal(false)}
          />
        )}
      </>
    );
  }

  // Tab Orders View
  if (view === 'tab-orders' && selectedTab) {
    return (
      <>
        <TabOrdersView
          tab={selectedTab}
          orders={tableOrders}
          loading={loadingOrders}
          onBack={() => {
            setView('tables');
            setSelectedTab(null);
            setTableOrders([]);
          }}
          onNewOrder={() => {
            setOrderMode('tab');
            setView('order');
            setCart([]);
            setOrderNotes('');
          }}
          onPrintReceipt={handlePrintReceipt}
          onCloseTab={() => {
            setTableTotal(tableOrdersTotal);
            setShowCloseModal(true);
          }}
          onReprintOrder={async (order) => {
            try {
              await reprintOrder({
                orderId: order.id,
                orderNumber: order.order_number,
              });
            } catch (error) {
              console.error('Error reprinting order:', error);
              toast.error('Erro ao reimprimir pedido');
            }
          }}
        />

        {/* Payment Modal */}
        {showCloseModal && (
          <PaymentModal
            total={tableOrdersTotal}
            paymentMethod={paymentMethod}
            cashReceived={cashReceived}
            isClosing={closingTable}
            onPaymentMethodChange={setPaymentMethod}
            onCashReceivedChange={setCashReceived}
            onConfirm={handleCloseTab}
            onClose={() => setShowCloseModal(false)}
          />
        )}
      </>
    );
  }

  return null;
}
