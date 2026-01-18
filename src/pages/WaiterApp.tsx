import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { usePrintSettings } from '@/hooks/usePrintSettings';
import { useWaiterData } from '@/hooks/useWaiterData';
import { usePrintToElectron } from '@/hooks/usePrintToElectron';
import logoGamakoWhite from '@/assets/logo-gamako-white.png';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AnimatedCard, 
  AnimatedModal, 
  StaggeredContainer, 
  staggerItemVariants,
  PageSlide,
} from '@/components/waiter/WaiterViewTransition';
import { 
  ArrowLeft,
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Loader2,
  Send,
  ChefHat,
  ClipboardList,
  RefreshCw,
  MessageSquare,
  LogOut,
  Menu,
  Bike,
  Users,
  MapPin,
  Phone,
  User,
  Package,
  Receipt,
  Eye,
  Printer,
  ArrowRightLeft,
  DollarSign,
  PlusCircle,
  MoreVertical,
  X,
  Rocket,
  Calculator,
  CreditCard,
  Banknote,
  QrCode,
  Check,
  RotateCcw,
  FileText,
  LayoutGrid,
  LayoutList,
  Delete,
  KeyRound,
  Pencil,
} from 'lucide-react';

interface Waiter {
  id: string;
  name: string;
  status: string;
  restaurant_id?: string;
}

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

interface Table {
  id: string;
  number: number;
  status: 'available' | 'occupied' | 'closing';
  capacity: number | null;
}

interface Tab {
  id: string;
  number: number;
  customer_name: string | null;
  customer_phone: string | null;
  status: 'available' | 'occupied' | 'closing';
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category_id: string | null;
  is_available: boolean;
  has_sizes?: boolean | null;
  price_small?: number | null;
  price_medium?: number | null;
  price_large?: number | null;
  image_url?: string | null;
}

type ProductSize = 'small' | 'medium' | 'large';

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
  size?: ProductSize | null;
  unitPrice: number;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  notes: string | null;
}

interface Order {
  id: string;
  order_number: number | null;
  table_id: string | null;
  tab_id: string | null;
  order_type: string;
  status: string;
  total: number;
  created_at: string;
  notes: string | null;
  customer_name: string | null;
  delivery_address: string | null;
  delivery_phone: string | null;
  delivery_fee: number | null;
  waiter_id: string | null;
  order_items?: OrderItem[];
  tables?: { number: number } | null;
  tabs?: { number: number; customer_name: string | null } | null;
  waiters?: { id: string; name: string } | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  cep: string | null;
}

interface DeliveryForm {
  customerName: string;
  customerPhone: string;
  address: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  cep: string;
  deliveryFee: number;
}

type AppView = 'login' | 'tables' | 'order' | 'delivery' | 'delivery-order' | 'table-orders' | 'tab-orders';
type OrderMode = 'table' | 'delivery' | 'takeaway' | 'tab';
type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';

export default function WaiterApp({ 
  externalWaiter, 
  externalRestaurant, 
  onExternalLogout 
}: WaiterAppProps = {}) {
  const { restaurant: authRestaurant, signOut } = useAuth();
  const restaurant = externalRestaurant || authRestaurant;
  const { shouldAutoPrint } = usePrintSettings();
  const { printConference, reprintOrder } = usePrintToElectron({ restaurantId: restaurant?.id });
  const isPublicAccess = !!externalRestaurant;
  
  // Data fetching hook
  const waiterData = useWaiterData({
    restaurantId: restaurant?.id || '',
    useEdgeFunction: isPublicAccess,
  });

  // States
  const [view, setView] = useState<AppView>(externalWaiter ? 'tables' : 'login');
  const [activeTab, setActiveTab] = useState<'mesas' | 'comandas'>('mesas');
  const [selectedWaiter, setSelectedWaiter] = useState<Waiter | null>(externalWaiter || null);
  const [tables, setTables] = useState<Table[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTab, setSelectedTab] = useState<Tab | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [editingItemNotes, setEditingItemNotes] = useState<string | null>(null);
  
  // PIN login states
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAuthenticating, setPinAuthenticating] = useState(false);
  
  // Table action modal
  const [showTableModal, setShowTableModal] = useState(false);
  const [modalTable, setModalTable] = useState<Table | null>(null);
  const [tableTotal, setTableTotal] = useState(0);
  
  // Table orders view
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [deliveredOrders, setDeliveredOrders] = useState<Set<string>>(new Set());
  
  // Order actions dropdown
  const [openOrderMenu, setOpenOrderMenu] = useState<string | null>(null);
  const [reprintingOrder, setReprintingOrder] = useState<string | null>(null);
  
  // Close table modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState(0);
  const [closingTable, setClosingTable] = useState(false);
  
  // Size selection modal
  const [sizeModalProduct, setSizeModalProduct] = useState<Product | null>(null);
  
  // Tab customer modal
  const [showTabCustomerModal, setShowTabCustomerModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const [tabCustomerName, setTabCustomerName] = useState('');
  const [tabCustomerPhone, setTabCustomerPhone] = useState('');
  const [savingTabCustomer, setSavingTabCustomer] = useState(false);
  
  // Create new tab modal
  const [showCreateTabModal, setShowCreateTabModal] = useState(false);
  const [newTabCustomerName, setNewTabCustomerName] = useState('');
  const [newTabCustomerPhone, setNewTabCustomerPhone] = useState('');
  const [creatingTab, setCreatingTab] = useState(false);
  
  // Edit tab customer modal
  const [showEditTabCustomerModal, setShowEditTabCustomerModal] = useState(false);
  const [editTabCustomerName, setEditTabCustomerName] = useState('');
  const [editTabCustomerPhone, setEditTabCustomerPhone] = useState('');
  const [savingEditTabCustomer, setSavingEditTabCustomer] = useState(false);
  
  // Order confirmation modal with notes summary
  const [showOrderConfirmModal, setShowOrderConfirmModal] = useState(false);
  
  // Menu view mode - persist in localStorage
  const [menuViewMode, setMenuViewMode] = useState<'list' | 'grid'>(() => {
    const saved = localStorage.getItem('waiter_menu_view_mode');
    return (saved === 'grid' || saved === 'list') ? saved : 'list';
  });
  
  // Save menu view mode preference
  useEffect(() => {
    localStorage.setItem('waiter_menu_view_mode', menuViewMode);
  }, [menuViewMode]);
  
  // Delivery states
  const [orderMode, setOrderMode] = useState<OrderMode>('table');
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!restaurant?.id) return;

      try {
        const [tablesData, tabsData, categoriesData, productsData] = await Promise.all([
          waiterData.fetchTables(),
          waiterData.fetchTabs(),
          waiterData.fetchCategories(),
          waiterData.fetchProducts(),
        ]);

        setTables(tablesData as Table[]);
        setTabs(tabsData as Tab[]);
        setCategories(categoriesData);
        setProducts(productsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurant?.id, isPublicAccess]);

  // Realtime subscription for tables (only for authenticated access)
  useEffect(() => {
    if (!restaurant?.id || isPublicAccess) return;

    const channel = supabase
      .channel('waiter-tables')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        async () => {
          const data = await waiterData.fetchTables();
          setTables(data as Table[]);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tabs' },
        async () => {
          const data = await waiterData.fetchTabs();
          setTabs(data as Tab[]);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        async () => {
          await refreshReadyOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, isPublicAccess]);

  // Polling for public access (no realtime)
  useEffect(() => {
    if (!restaurant?.id || !isPublicAccess) return;

    const pollData = async () => {
      const [tablesData, tabsData] = await Promise.all([
        waiterData.fetchTables(),
        waiterData.fetchTabs(),
      ]);
      setTables(tablesData as Table[]);
      setTabs(tabsData as Tab[]);
      await refreshReadyOrders();
    };

    const interval = setInterval(pollData, 5000);
    return () => clearInterval(interval);
  }, [restaurant?.id, isPublicAccess]);

  // Fetch orders for a table with ready status
  const [tableReadyOrders, setTableReadyOrders] = useState<Record<string, boolean>>({});
  
  const refreshReadyOrders = useCallback(async () => {
    if (!restaurant?.id) return;
    
    const data = await waiterData.fetchReadyOrders();
    const readyMap: Record<string, boolean> = {};
    data?.forEach((order: { table_id: string | null }) => {
      if (order.table_id) readyMap[order.table_id] = true;
    });
    setTableReadyOrders(readyMap);
  }, [restaurant?.id, waiterData]);
  
  useEffect(() => {
    refreshReadyOrders();
    const interval = setInterval(refreshReadyOrders, 5000);
    return () => clearInterval(interval);
  }, [refreshReadyOrders]);

  // Close order menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openOrderMenu) {
        setOpenOrderMenu(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openOrderMenu]);

  // Fetch table total when modal opens
  const fetchTableTotal = async (tableId: string) => {
    const total = await waiterData.fetchTableTotal(tableId);
    setTableTotal(total);
  };

  // Fetch orders for table orders view
  const fetchTableOrders = async (tableId: string) => {
    setLoadingOrders(true);
    try {
      const data = await waiterData.fetchTableOrders(tableId);
      setTableOrders(data || []);
      setDeliveredOrders(new Set());
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch tab orders
  const fetchTabOrders = async (tabId: string) => {
    setLoadingOrders(true);
    try {
      const data = await waiterData.fetchTabOrders(tabId);
      setTableOrders(data || []);
      setDeliveredOrders(new Set());
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Search customers by phone
  const searchCustomers = async (phone: string) => {
    if (!restaurant?.id || phone.length < 3) {
      setCustomers([]);
      return;
    }

    setSearchingCustomer(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .or(`phone.ilike.%${phone}%,name.ilike.%${phone}%`)
        .limit(5);

      if (error) throw error;
      setCustomers((data || []) as Customer[]);
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setSearchingCustomer(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearchTerm.length >= 3) {
        searchCustomers(customerSearchTerm);
      } else {
        setCustomers([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearchTerm, restaurant?.id]);

  const filteredTables = tables.filter(t => {
    if (!tableSearchTerm) return true;
    return t.number.toString().includes(tableSearchTerm) ||
           `Mesa ${t.number}`.toLowerCase().includes(tableSearchTerm.toLowerCase());
  });

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // PIN Login function
  const handlePinLogin = async (pinValue?: string) => {
    const currentPin = pinValue || pinInput;
    
    if (!restaurant?.id || currentPin.length < 4) {
      return;
    }

    if (pinAuthenticating) return;

    setPinAuthenticating(true);
    setPinError(null);
    
    try {
      const { data: waiter, error: queryError } = await supabase
        .from('waiters')
        .select('id, name, status, restaurant_id')
        .eq('restaurant_id', restaurant.id)
        .eq('pin', currentPin)
        .maybeSingle();

      if (queryError) {
        console.error('Query error:', queryError);
        setPinError('Erro ao verificar PIN');
        setPinInput('');
        return;
      }

      if (!waiter) {
        setPinError('PIN não encontrado');
        setPinInput('');
        return;
      }

      if (waiter.status !== 'active') {
        setPinError('Garçom inativo');
        setPinInput('');
        return;
      }

      setSelectedWaiter(waiter);
      setView('tables');
      toast.success(`Bem-vindo, ${waiter.name}!`);
    } catch (error) {
      console.error('Login exception:', error);
      setPinError('Erro ao autenticar');
      setPinInput('');
    } finally {
      setPinAuthenticating(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pinInput.length < 6) {
      const newPin = pinInput + digit;
      setPinInput(newPin);
      setPinError(null);
      
      if (newPin.length >= 4) {
        setTimeout(() => handlePinLogin(newPin), 200);
      }
    }
  };

  const handlePinDelete = () => {
    if (pinInput.length > 0) {
      setPinInput(pinInput.slice(0, -1));
      setPinError(null);
    }
  };

  const handlePinClear = () => {
    setPinInput('');
    setPinError(null);
  };


  const handleTableClick = async (table: Table) => {
    setModalTable(table);
    await fetchTableTotal(table.id);
    setShowTableModal(true);
  };

  const handleNewOrder = (table: Table) => {
    setSelectedTable(table);
    setOrderMode('table');
    setShowTableModal(false);
    setView('order');
    setCart([]);
    setSearchTerm('');
    setSelectedCategory(null);
    setOrderNotes('');
  };

  const handleViewOrders = async (table: Table) => {
    setSelectedTable(table);
    setShowTableModal(false);
    await fetchTableOrders(table.id);
    setView('table-orders');
  };

  // Handle tab click - show customer modal if available, otherwise go to orders
  const handleTabClick = (tab: Tab) => {
    if (tab.status === 'available') {
      // Show modal to collect customer info before creating first order
      setPendingTab(tab);
      setTabCustomerName('');
      setTabCustomerPhone('');
      setShowTabCustomerModal(true);
    } else {
      // Go directly to orders
      setSelectedTab(tab);
      fetchTabOrders(tab.id);
      setView('tab-orders');
    }
  };

  // Save tab customer info and proceed to order
  const handleSaveTabCustomer = async () => {
    if (!pendingTab || !tabCustomerName.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    setSavingTabCustomer(true);
    try {
      // Update tab with customer info
      const { error } = await supabase
        .from('tabs')
        .update({ 
          customer_name: tabCustomerName.trim(),
          customer_phone: tabCustomerPhone.trim() || null,
          status: 'occupied'
        })
        .eq('id', pendingTab.id);

      if (error) throw error;

      // Update local state
      setTabs(prev => prev.map(t => 
        t.id === pendingTab.id 
          ? { ...t, customer_name: tabCustomerName.trim(), customer_phone: tabCustomerPhone.trim() || null, status: 'occupied' as const }
          : t
      ));

      // Set selected tab and go to order view
      setSelectedTab({
        ...pendingTab,
        customer_name: tabCustomerName.trim(),
        customer_phone: tabCustomerPhone.trim() || null,
        status: 'occupied'
      });
      setOrderMode('tab');
      setView('order');
      setCart([]);
      setSearchTerm('');
      setSelectedCategory(null);
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

  // Create a new tab dynamically
  const handleCreateNewTab = async () => {
    if (!restaurant?.id) return;
    if (!newTabCustomerName.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    setCreatingTab(true);
    try {
      // Get the next tab number
      const maxNumber = tabs.length > 0 
        ? Math.max(...tabs.map(t => t.number)) 
        : 0;
      const nextNumber = maxNumber + 1;

      // Create new tab
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

      // Update local state
      const createdTab: Tab = {
        id: newTab.id,
        number: newTab.number,
        customer_name: newTab.customer_name,
        customer_phone: newTab.customer_phone,
        status: 'occupied'
      };
      setTabs(prev => [...prev, createdTab]);

      // Set selected tab and go to order view
      setSelectedTab(createdTab);
      setOrderMode('tab');
      setView('order');
      setCart([]);
      setSearchTerm('');
      setSelectedCategory(null);
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

  // Edit tab customer info
  const handleEditTabCustomer = async () => {
    if (!selectedTab || !editTabCustomerName.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }

    setSavingEditTabCustomer(true);
    try {
      const { error } = await supabase
        .from('tabs')
        .update({ 
          customer_name: editTabCustomerName.trim(),
          customer_phone: editTabCustomerPhone.trim() || null,
        })
        .eq('id', selectedTab.id);

      if (error) throw error;

      // Update local state
      const updatedTab = {
        ...selectedTab,
        customer_name: editTabCustomerName.trim(),
        customer_phone: editTabCustomerPhone.trim() || null,
      };
      setSelectedTab(updatedTab);
      setTabs(prev => prev.map(t => 
        t.id === selectedTab.id 
          ? { ...t, customer_name: editTabCustomerName.trim(), customer_phone: editTabCustomerPhone.trim() || null }
          : t
      ));
      
      setShowEditTabCustomerModal(false);
      toast.success('Dados do cliente atualizados!');
    } catch (error: any) {
      console.error('Error updating tab customer:', error);
      toast.error('Erro ao atualizar dados do cliente');
    } finally {
      setSavingEditTabCustomer(false);
    }
  };

  const handleStartDelivery = (mode: 'delivery' | 'takeaway') => {
    setOrderMode(mode);
    setView('delivery');
    setCart([]);
    setSearchTerm('');
    setSelectedCategory(null);
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
    setCustomerSearchTerm('');
    setCustomers([]);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDeliveryForm({
      customerName: customer.name,
      customerPhone: customer.phone,
      address: customer.address || '',
      number: customer.number || '',
      complement: customer.complement || '',
      neighborhood: customer.neighborhood || '',
      city: customer.city || '',
      cep: customer.cep || '',
      deliveryFee: deliveryForm.deliveryFee,
    });
    setCustomerSearchTerm('');
    setCustomers([]);
  };

  const handleProceedToOrder = () => {
    if (!deliveryForm.customerName.trim()) {
      toast.error('Nome do cliente é obrigatório');
      return;
    }
    if (!deliveryForm.customerPhone.trim()) {
      toast.error('Telefone do cliente é obrigatório');
      return;
    }
    if (orderMode === 'delivery' && !deliveryForm.address.trim()) {
      toast.error('Endereço é obrigatório para delivery');
      return;
    }
    setView('delivery-order');
  };

  const getProductPrice = (product: Product, size: ProductSize | null): number => {
    // For products with sizes, use the size-specific price
    if (product.has_sizes && size) {
      switch (size) {
        case 'small': return product.price_small ?? product.price ?? 0;
        case 'medium': return product.price_medium ?? product.price ?? 0;
        case 'large': return product.price_large ?? product.price ?? 0;
        default: return product.price ?? 0;
      }
    }
    // For products without sizes or no size selected, use base price
    // If base price is 0 and it has sizes, return smallest available price
    if (product.has_sizes && !size) {
      const availablePrices = [
        product.price_small,
        product.price_medium,
        product.price_large,
      ].filter((p): p is number => p != null && p > 0);
      return availablePrices.length > 0 ? Math.min(...availablePrices) : product.price ?? 0;
    }
    return product.price ?? 0;
  };

  const getSizeLabel = (size: ProductSize | null | undefined): string => {
    switch (size) {
      case 'small': return 'P';
      case 'medium': return 'M';
      case 'large': return 'G';
      default: return '';
    }
  };

  const handleProductClick = (product: Product) => {
    if (product.has_sizes) {
      setSizeModalProduct(product);
    } else {
      addToCartWithSize(product, null);
    }
  };

  const addToCartWithSize = (product: Product, size: ProductSize | null) => {
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

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  const orderTotal = cartTotal + (orderMode === 'delivery' ? deliveryForm.deliveryFee : 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Check if has any observations
  const hasObservations = cart.some(item => item.notes) || orderNotes;
  const itemsWithNotes = cart.filter(item => item.notes);

  const handleTrySubmitOrder = () => {
    if (orderMode === 'table' && (!selectedTable || cart.length === 0)) return;
    if (orderMode === 'tab' && (!selectedTab || cart.length === 0)) return;
    if ((orderMode === 'delivery' || orderMode === 'takeaway') && cart.length === 0) return;

    // If has observations, show confirmation modal first
    if (hasObservations) {
      setShowOrderConfirmModal(true);
      return;
    }

    // Otherwise, submit directly
    handleSubmitOrder();
  };

  const handleSubmitOrder = async () => {
    setShowOrderConfirmModal(false);
    setSubmitting(true);

    try {
      const autoPrint = shouldAutoPrint(orderMode === 'table' || orderMode === 'tab' ? 'table' : 'delivery');

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
      // For delivery/takeaway on public access, skip customer creation (RLS will block it)
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
      }));

      // Use waiterData.createOrder which uses edge function for public access
      const orderData = {
        table_id: orderMode === 'table' ? selectedTable?.id : null,
        tab_id: orderMode === 'tab' ? selectedTab?.id : null,
        order_type: orderMode === 'tab' ? 'table' : orderMode,
        print_status: 'pending',
        total: orderTotal,
        notes: orderNotes || null,
        customer_id: customerId,
        customer_name: orderMode === 'tab' ? selectedTab?.customer_name : (orderMode !== 'table' ? deliveryForm.customerName : null),
        delivery_address: orderMode === 'delivery' ? fullAddress : null,
        delivery_phone: orderMode !== 'table' && orderMode !== 'tab' ? deliveryForm.customerPhone : null,
        delivery_fee: orderMode === 'delivery' ? deliveryForm.deliveryFee : 0,
        waiter_id: selectedWaiter?.id || null,
        items: orderItems,
      };

      const result = await waiterData.createOrder(orderData);
      
      if (!result.success) {
        throw new Error('Falha ao criar pedido');
      }

      const successMessage = orderMode === 'table'
        ? `Pedido da Mesa ${selectedTable?.number} enviado!`
        : orderMode === 'tab'
          ? `Pedido da Comanda #${selectedTab?.number} enviado!`
          : orderMode === 'delivery'
            ? `Pedido delivery para ${deliveryForm.customerName} enviado!`
            : `Pedido para levar de ${deliveryForm.customerName} enviado!`;

      toast.success(successMessage);

      // Refresh tables using the hook
      const [tablesData, tabsData] = await Promise.all([
        waiterData.fetchTables(),
        waiterData.fetchTabs(),
      ]);
      setTables(tablesData as Table[]);
      setTabs(tabsData as Tab[]);

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

  const handleMarkDelivered = (orderId: string) => {
    setDeliveredOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleCloseTable = async () => {
    if (!selectedTable) return;
    
    setClosingTable(true);
    try {
      // Use waiterData.closeOrders which uses edge function for public access
      await waiterData.closeOrders({
        order_ids: tableOrders.map(o => o.id),
        table_id: selectedTable.id,
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'cash' ? cashReceived : undefined,
        change_given: paymentMethod === 'cash' && cashReceived > tableTotal ? cashReceived - tableTotal : undefined,
      });
      
      toast.success(`Mesa ${selectedTable.number} fechada com sucesso!`);
      setShowCloseModal(false);
      setView('tables');
      setSelectedTable(null);
      setTableOrders([]);
      
      // Refresh tables using the hook
      const tablesData = await waiterData.fetchTables();
      setTables(tablesData as Table[]);
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
      // Use waiterData.closeOrders which uses edge function for public access
      await waiterData.closeOrders({
        order_ids: tableOrders.map(o => o.id),
        tab_id: selectedTab.id,
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'cash' ? cashReceived : undefined,
        change_given: paymentMethod === 'cash' && cashReceived > tableTotal ? cashReceived - tableTotal : undefined,
      });
      
      toast.success(`Comanda #${selectedTab.number} fechada com sucesso!`);
      setShowCloseModal(false);
      setView('tables');
      setSelectedTab(null);
      setTableOrders([]);
      
      // Refresh tabs using the hook
      const tabsData = await waiterData.fetchTabs();
      setTabs(tabsData as Tab[]);
    } catch (error: any) {
      toast.error('Erro ao fechar comanda');
    } finally {
      setClosingTable(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!selectedTable) return;
    
    const total = tableOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const allItems = tableOrders.flatMap(o => o.order_items || []);
    
    try {
      // Send to Electron app for thermal printing
      await printConference({
        entityType: 'table',
        entityNumber: selectedTable.number,
        customerName: null,
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

  // Reprint single order via Electron
  const handleReprintOrder = async (order: Order) => {
    setReprintingOrder(order.id);
    setOpenOrderMenu(null);
    
    try {
      // Use the usePrintToElectron hook for reprinting
      await reprintOrder({
        orderId: order.id,
        orderNumber: order.order_number,
      });
    } catch (error) {
      console.error('Error reprinting order:', error);
      toast.error('Erro ao reimprimir pedido');
    } finally {
      setReprintingOrder(null);
    }
  };

  const tableOrdersTotal = tableOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const change = paymentMethod === 'cash' && cashReceived > tableOrdersTotal ? cashReceived - tableOrdersTotal : 0;

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen flex items-center justify-center bg-[#0d1b2a]"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="text-center"
        >
          <Loader2 className="w-10 h-10 animate-spin text-white mx-auto mb-4" />
          <p className="text-white/80">Carregando...</p>
        </motion.div>
      </motion.div>
    );
  }

  // Animation variants for page transitions
  const pageVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  const pageTransition = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30,
  };

  // Table Orders View (like image 3)
  if (view === 'table-orders' && selectedTable) {
    return (
      <motion.div 
        key="table-orders"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col"
      >
        {/* Header */}
        <header className="sticky top-0 bg-gradient-to-r from-primary to-primary/90 text-white p-4 z-10 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 rounded-xl"
              onClick={() => { setView('tables'); setSelectedTable(null); setTableOrders([]); }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-xl">Mesa {selectedTable.number}</h1>
              <p className="text-xs text-white/70">{tableOrders.length} pedido(s)</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </header>

        {/* Orders List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {loadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : tableOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                  <ClipboardList className="w-10 h-10 text-white/40" />
                </div>
                <p className="text-white/60 font-medium">Nenhum pedido ativo</p>
                <p className="text-white/40 text-sm mt-1">Adicione um novo pedido</p>
              </div>
            ) : (
              tableOrders.map((order) => (
                <div key={order.id} className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl overflow-hidden border border-white/5 shadow-xl backdrop-blur-sm">
                  {/* Order Header */}
                  <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-lg">#{order.order_number || '---'}</span>
                        {order.status === 'ready' && (
                          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2 py-0.5">
                            ✓ Pronto
                          </Badge>
                        )}
                        {order.status === 'preparing' && (
                          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold px-2 py-0.5">
                            🍳 Preparando
                          </Badge>
                        )}
                        {order.status === 'pending' && (
                          <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold px-2 py-0.5">
                            ⏳ Pendente
                          </Badge>
                        )}
                      </div>
                      {order.waiters?.name && (
                        <p className="text-white/50 text-xs mt-1.5 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {order.waiters.name}
                        </p>
                      )}
                    </div>
                    <div className="relative">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenOrderMenu(openOrderMenu === order.id ? null : order.id);
                        }}
                      >
                        {reprintingOrder === order.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <MoreVertical className="w-5 h-5" />
                        )}
                      </Button>
                      
                      {/* Dropdown Menu */}
                      {openOrderMenu === order.id && (
                        <div 
                          className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-2xl z-50 overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleReprintOrder(order)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span className="text-sm font-medium">Reimprimir Pedido</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  <div className="p-4 space-y-3">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                            <span className="text-primary text-xs font-bold">{item.quantity}x</span>
                          </div>
                          <span className="text-white/90 font-medium">{item.product_name}</span>
                        </div>
                        <span className="text-white font-semibold">{formatCurrency(item.product_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Order Footer */}
                  <div className="p-4 border-t border-white/10 bg-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-white/70">Subtotal</span>
                      <span className="text-white font-bold text-lg">{formatCurrency(order.total || 0)}</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <Checkbox 
                        id={`delivered-${order.id}`}
                        checked={deliveredOrders.has(order.id)}
                        onCheckedChange={() => handleMarkDelivered(order.id)}
                        className="border-white/40 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      <label htmlFor={`delivered-${order.id}`} className="text-white/70 text-sm cursor-pointer">
                        Marcar como entregue
                      </label>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer Totals */}
        <div className="bg-gradient-to-t from-slate-950 to-slate-900 border-t border-white/10 p-4">
          <div className="flex justify-between text-white/60 mb-2 text-sm">
            <span>Subtotal</span>
            <span>{formatCurrency(tableOrdersTotal)}</span>
          </div>
          <div className="flex justify-between text-white text-2xl font-bold mb-5">
            <span>Total</span>
            <span>{formatCurrency(tableOrdersTotal)}</span>
          </div>
          
          {/* Bottom Actions */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Button 
              variant="outline" 
              className="h-14 flex flex-col items-center gap-1 border-white/20 text-white hover:bg-white/10 rounded-xl"
              onClick={handlePrintReceipt}
            >
              <FileText className="w-5 h-5" />
              <span className="text-xs">Conferência</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-14 flex flex-col items-center gap-1 border-white/20 text-white hover:bg-white/10 rounded-xl"
              onClick={() => toast.info('Função de transferência em breve')}
            >
              <RefreshCw className="w-5 h-5" />
              <span className="text-xs">Transferir</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-14 flex flex-col items-center gap-1 border-white/20 text-white hover:bg-white/10 rounded-xl"
              onClick={() => {
                setTableTotal(tableOrdersTotal);
                setShowCloseModal(true);
              }}
            >
              <DollarSign className="w-5 h-5" />
              <span className="text-xs">Fechar</span>
            </Button>
          </div>
          
          <Button 
            className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 rounded-xl gap-2"
            onClick={() => {
              setOrderMode('table');
              setView('order');
              setCart([]);
            }}
          >
            <Plus className="w-5 h-5" />
            Novo Pedido
          </Button>
        </div>

        {/* Close Table Modal */}
        {showCloseModal && selectedTable && (
          <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
            <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Fechar Mesa {selectedTable.number}</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowCloseModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="text-center py-4">
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(tableOrdersTotal)}</p>
                <p className="text-slate-500">Mesa {selectedTable.number}</p>
              </div>
              
              {/* Payment Method */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cash', label: 'Dinheiro', icon: Banknote },
                  { id: 'credit', label: 'Crédito', icon: CreditCard },
                  { id: 'debit', label: 'Débito', icon: CreditCard },
                  { id: 'pix', label: 'PIX', icon: QrCode },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all ${
                      paymentMethod === id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setPaymentMethod(id as PaymentMethod)}
                  >
                    <Icon className="w-5 h-5 text-slate-700" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
              
              {paymentMethod === 'cash' && (
                <div className="space-y-2">
                  <label className="text-sm text-slate-600">Valor recebido:</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">R$</span>
                    <Input
                      type="number"
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                      className="pl-10 h-12 text-lg"
                      placeholder="0,00"
                    />
                  </div>
                  {change > 0 && (
                    <p className="text-emerald-600 font-semibold">
                      Troco: {formatCurrency(change)}
                    </p>
                  )}
                </div>
              )}
              
              <Button 
                className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
                onClick={handleCloseTable}
                disabled={closingTable}
              >
                {closingTable ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Confirmar Fechamento
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // Login / PIN Entry View
  if (view === 'login') {
    return (
      <motion.div 
        key="login"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={pageTransition}
        className="min-h-screen bg-gradient-to-br from-slate-900 via-primary/20 to-slate-900 flex flex-col relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        
        {/* Header */}
        <header className="pt-10 pb-6 text-center relative z-10">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-xl">
            <img 
              src={logoGamakoWhite} 
              alt="Gamako" 
              className="h-12 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">{restaurant?.name}</h1>
          <p className="text-amber-400 mt-2 text-sm font-semibold flex items-center justify-center gap-2">
            <ChefHat className="w-4 h-4" />
            Acesso do Garçom
          </p>
        </header>

        {/* PIN Display */}
        <div className="flex-1 flex flex-col items-center justify-start px-6 pt-4 relative z-10">
          <div className="w-full max-w-xs">
            {/* PIN Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10">
              {/* PIN Icon */}
              <div className="flex justify-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <KeyRound className="w-7 h-7 text-white" />
                </div>
              </div>
              
              {/* PIN Dots */}
              <div className="flex justify-center gap-4 mb-5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      i < pinInput.length 
                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 scale-125 shadow-lg shadow-amber-400/50' 
                        : 'bg-white/10 border-2 border-white/20'
                    }`}
                  />
                ))}
              </div>

              {/* Error/Status message */}
              <div className="h-6 flex items-center justify-center mb-4">
                {pinAuthenticating ? (
                  <div className="flex items-center gap-2 text-amber-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Verificando...</span>
                  </div>
                ) : pinError ? (
                  <p className="text-rose-400 text-sm font-medium">{pinError}</p>
                ) : (
                  <p className="text-white/50 text-xs">Digite seu PIN de 4-6 dígitos</p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handlePinDigit(num.toString())}
                    disabled={pinAuthenticating || pinInput.length >= 6}
                    className="aspect-square text-2xl font-bold rounded-2xl bg-white/5 text-white border border-white/10 hover:bg-white/10 active:bg-amber-500 active:text-white active:border-amber-500 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg hover:shadow-xl active:scale-95"
                  >
                    {num}
                  </button>
                ))}
              
                {/* Clear button */}
                <button
                  onClick={handlePinClear}
                  disabled={pinAuthenticating || pinInput.length === 0}
                  className="aspect-square text-xs font-medium rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white active:bg-rose-500/20 active:text-rose-400 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 flex items-center justify-center"
                >
                  Limpar
                </button>
              
                {/* Zero */}
                <button
                  onClick={() => handlePinDigit('0')}
                  disabled={pinAuthenticating || pinInput.length >= 6}
                  className="aspect-square text-2xl font-bold rounded-2xl bg-white/5 text-white border border-white/10 hover:bg-white/10 active:bg-amber-500 active:text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                >
                  0
                </button>
              
                {/* Delete button */}
                <button
                  onClick={handlePinDelete}
                  disabled={pinAuthenticating || pinInput.length === 0}
                  className="aspect-square rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white active:bg-amber-400/20 active:text-amber-400 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 flex items-center justify-center"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 flex flex-col items-center gap-2 relative z-10">
          <p className="text-white/40 text-xs">
            Fale com seu gerente caso não tenha seu PIN
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onExternalLogout || signOut} 
            className="text-white/50 hover:text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </footer>
      </motion.div>
    );
  }

  // Delivery Form View
  if (view === 'delivery') {
    return (
      <motion.div 
        key="delivery"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen bg-[#f5f5f5] flex flex-col"
      >
        <header className="sticky top-0 bg-[#0d1b2a] text-white p-4 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setView('tables')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold">
                {orderMode === 'delivery' ? 'Novo Pedido Delivery' : 'Pedido Para Levar'}
              </h1>
              <p className="text-xs opacity-80">Dados do cliente</p>
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Customer Search */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                <Search className="w-4 h-4" />
                Buscar cliente existente
              </Label>
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={customerSearchTerm}
                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                className="bg-gray-50"
              />
              
              {customers.length > 0 && (
                <div className="mt-2 border rounded-lg divide-y">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full p-3 text-left hover:bg-gray-50"
                    >
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.phone}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-4 h-4" />
                Dados do Cliente
              </h3>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm text-gray-600">Nome *</Label>
                  <Input
                    placeholder="Nome do cliente"
                    value={deliveryForm.customerName}
                    onChange={(e) => setDeliveryForm(prev => ({ ...prev, customerName: e.target.value }))}
                    className="bg-gray-50"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-600">Telefone *</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={deliveryForm.customerPhone}
                    onChange={(e) => setDeliveryForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Address for delivery */}
            {orderMode === 'delivery' && (
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereço de Entrega
                </h3>
                
                <div className="space-y-3">
                  <Input
                    placeholder="Endereço *"
                    value={deliveryForm.address}
                    onChange={(e) => setDeliveryForm(prev => ({ ...prev, address: e.target.value }))}
                    className="bg-gray-50"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Número"
                      value={deliveryForm.number}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, number: e.target.value }))}
                      className="bg-gray-50"
                    />
                    <Input
                      placeholder="Complemento"
                      value={deliveryForm.complement}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, complement: e.target.value }))}
                      className="bg-gray-50"
                    />
                  </div>
                  <Input
                    placeholder="Bairro"
                    value={deliveryForm.neighborhood}
                    onChange={(e) => setDeliveryForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                    className="bg-gray-50"
                  />
                  <div>
                    <Label className="text-sm text-gray-600">Taxa de Entrega</Label>
                    <Input
                      type="number"
                      placeholder="0,00"
                      value={deliveryForm.deliveryFee || ''}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                      className="bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 bg-white border-t">
          <Button
            className="w-full h-14 text-lg bg-[#0ea5e9] hover:bg-[#0284c7]"
            onClick={handleProceedToOrder}
          >
            Continuar para Pedido
            <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
          </Button>
        </div>
      </motion.div>
    );
  }

  // Delivery Order View
  if (view === 'delivery-order') {
    return (
      <motion.div 
        key="delivery-order"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen bg-[#f5f5f5] flex flex-col"
      >
        <header className="sticky top-0 bg-[#0d1b2a] text-white p-4 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setView('delivery')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold">
                {orderMode === 'delivery' ? 'Delivery' : 'Para Levar'} - {deliveryForm.customerName}
              </h1>
              <p className="text-xs opacity-80">
                {cart.length > 0 ? `${cart.length} itens` : 'Adicionar itens'}
              </p>
            </div>
          </div>
        </header>

        {/* Search & Categories */}
        <div className="p-3 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-gray-50"
            />
          </div>
        </div>

        <div className="px-3 py-2 bg-white border-b overflow-x-auto">
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              className={`shrink-0 ${selectedCategory === null ? 'bg-[#0ea5e9]' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                className={`shrink-0 ${selectedCategory === category.id ? 'bg-[#0ea5e9]' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.icon && <span className="mr-1">{category.icon}</span>}
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products */}
        <ScrollArea className="flex-1">
          <div className="p-3 grid gap-2">
            {filteredProducts.map((product) => {
              const totalQty = cart.filter(i => i.product.id === product.id).reduce((s, i) => s + i.quantity, 0);
              return (
                <button
                  key={product.id}
                  className={`flex items-center justify-between p-4 bg-white rounded-xl border-2 text-left ${
                    totalQty > 0 ? 'border-[#0ea5e9] bg-[#0ea5e9]/5' : 'border-transparent shadow-sm'
                  }`}
                  onClick={() => handleProductClick(product)}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-[#0ea5e9] font-bold">
                      {product.has_sizes 
                        ? `A partir de ${formatCurrency(Math.min(product.price_small ?? Infinity, product.price_medium ?? Infinity, product.price_large ?? Infinity))}`
                        : formatCurrency(product.price)}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    totalQty > 0 ? 'bg-[#0ea5e9] text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {totalQty > 0 ? <span className="text-lg font-bold">{totalQty}</span> : <Plus className="w-5 h-5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t shadow-lg p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold text-[#0d1b2a]">{formatCurrency(orderTotal)}</p>
              </div>
              <Button
                className="h-14 px-8 text-lg bg-[#0ea5e9] hover:bg-[#0284c7]"
                disabled={submitting}
                onClick={handleSubmitOrder}
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5 mr-2" />Enviar</>}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // Order View (Table or Tab)
  if (view === 'order') {
    const orderTitle = orderMode === 'tab' 
      ? `Comanda #${selectedTab?.number}`
      : `Mesa ${selectedTable?.number}`;
      
    return (
      <motion.div 
        key="order"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen bg-background flex flex-col"
      >
        <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => { 
                if (orderMode === 'tab') {
                  setView('tab-orders');
                } else {
                  setView('tables'); 
                }
                setCart([]); 
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-semibold">{orderTitle}</h1>
              <p className="text-xs opacity-80">
                {cart.length > 0 ? `${cart.length} item(ns)` : 'Novo pedido'}
              </p>
            </div>
          </div>
        </header>

        {/* Search */}
        <div className="p-3 bg-background border-b">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={menuViewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                className="h-10 w-10 rounded-none"
                onClick={() => setMenuViewMode('list')}
              >
                <LayoutList className="w-4 h-4" />
              </Button>
              <Button
                variant={menuViewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                className="h-10 w-10 rounded-none"
                onClick={() => setMenuViewMode('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="px-3 py-2 bg-muted/30 border-b overflow-x-auto">
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              className="shrink-0"
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                className="shrink-0"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.icon && <span className="mr-1">{category.icon}</span>}
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products */}
        <ScrollArea className="flex-1">
          <div className={`p-3 ${menuViewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'grid gap-2'}`}>
            {filteredProducts.map((product) => {
              const totalQty = cart.filter(i => i.product.id === product.id).reduce((s, i) => s + i.quantity, 0);
              
              if (menuViewMode === 'grid') {
                return (
                  <button
                    key={product.id}
                    className={`flex flex-col p-2 bg-card rounded-xl border text-left transition-all relative ${
                      totalQty > 0 ? 'border-primary bg-primary/5' : 'border-transparent shadow-sm'
                    }`}
                    onClick={() => handleProductClick(product)}
                  >
                    {/* Quantity Badge */}
                    {totalQty > 0 && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold z-10">
                        {totalQty}
                      </div>
                    )}
                    
                    {/* Product Image */}
                    <div className="w-full aspect-square rounded-lg bg-muted overflow-hidden mb-2">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Package className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      {product.has_sizes && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded inline-block mt-0.5">P/M/G</span>
                      )}
                      <p className="text-primary font-semibold text-sm mt-1">
                        {product.has_sizes 
                          ? (() => {
                              const prices = [product.price_small, product.price_medium, product.price_large].filter((p): p is number => p != null && p > 0);
                              const minPrice = prices.length > 0 ? Math.min(...prices) : product.price;
                              return `A partir de ${formatCurrency(minPrice ?? 0)}`;
                            })()
                          : formatCurrency(product.price ?? 0)}
                      </p>
                    </div>
                  </button>
                );
              }
              
              // List mode (default)
              return (
                <button
                  key={product.id}
                  className={`flex items-center gap-3 p-3 bg-card rounded-xl border text-left transition-all ${
                    totalQty > 0 ? 'border-primary bg-primary/5' : 'border-transparent shadow-sm'
                  }`}
                  onClick={() => handleProductClick(product)}
                >
                  {/* Product Image */}
                  <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{product.name}</p>
                      {product.has_sizes && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">P/M/G</span>
                      )}
                    </div>
                    <p className="text-primary font-semibold text-sm">
                      {product.has_sizes 
                        ? (() => {
                            const prices = [product.price_small, product.price_medium, product.price_large].filter((p): p is number => p != null && p > 0);
                            const minPrice = prices.length > 0 ? Math.min(...prices) : product.price;
                            return `A partir de ${formatCurrency(minPrice ?? 0)}`;
                          })()
                        : formatCurrency(product.price ?? 0)}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    totalQty > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {totalQty > 0 ? <span className="font-bold">{totalQty}</span> : <Plus className="w-4 h-4" />}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="sticky bottom-0 bg-background border-t shadow-lg">
            <ScrollArea className="max-h-48 p-3">
              <div className="space-y-2">
                {cart.map((item, index) => {
                  const itemKey = `${item.product.id}-${item.size}-${index}`;
                  const isEditingThis = editingItemNotes === itemKey;
                  
                  return (
                  <div key={itemKey} className="bg-muted/50 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.product.name}
                          {item.size && (
                            <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded">
                              {getSizeLabel(item.size)}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.unitPrice)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, item.size, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, item.size, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-7 w-7 ${item.notes ? 'text-primary' : 'text-muted-foreground'}`}
                          onClick={() => {
                            if (isEditingThis) {
                              setEditingItemNotes(null);
                            } else {
                              setEditingItemNotes(itemKey);
                            }
                          }}
                        >
                          <MessageSquare className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromCart(item.product.id, item.size)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Inline notes editor */}
                    {isEditingThis && (
                      <div className="mt-2">
                        <Input
                          placeholder="Obs: sem cebola, bem passado..."
                          value={item.notes}
                          onChange={(e) => updateItemNotes(item.product.id, item.size, e.target.value)}
                          className="h-8 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingItemNotes(null);
                            }
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Show notes badge if has notes and not editing */}
                    {item.notes && !isEditingThis && (
                      <p className="mt-1 text-xs text-muted-foreground bg-muted rounded px-2 py-0.5 truncate">
                        💬 {item.notes}
                      </p>
                    )}
                  </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            {/* Order General Notes */}
            <div className="px-3 py-2 border-t">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Observação do pedido</span>
              </div>
              <Textarea
                placeholder="Obs geral: mesa do fundo, entregar primeiro a bebida..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="h-16 text-xs resize-none"
                rows={2}
              />
            </div>

            <div className="p-3 pt-0 flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{formatCurrency(cartTotal)}</p>
              </div>
              <Button
                className="h-12 px-6"
                disabled={submitting}
                onClick={handleTrySubmitOrder}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Order Confirmation Modal with Notes Summary */}
        {showOrderConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-background rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Confirmar Pedido</h3>
                    <p className="text-sm text-muted-foreground">
                      {orderMode === 'table' && selectedTable && `Mesa ${selectedTable.number}`}
                      {orderMode === 'tab' && selectedTab && `Comanda #${selectedTab.number}`}
                      {orderMode === 'delivery' && 'Delivery'}
                      {orderMode === 'takeaway' && 'Para Levar'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {/* Items Summary */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Itens ({cart.length})
                    </p>
                    <div className="space-y-2">
                      {cart.map((item, index) => (
                        <div 
                          key={`${item.product.id}-${item.size}-${index}`}
                          className={`p-3 rounded-lg border ${item.notes ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800' : 'bg-muted/30'}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {item.quantity}x {item.product.name}
                                {item.size && <span className="text-muted-foreground"> ({getSizeLabel(item.size)})</span>}
                              </p>
                              {item.notes && (
                                <div className="mt-1.5 flex items-start gap-1.5">
                                  <MessageSquare className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-amber-700 dark:text-amber-400">
                                    {item.notes}
                                  </p>
                                </div>
                              )}
                            </div>
                            <p className="text-sm font-semibold text-primary whitespace-nowrap">
                              {formatCurrency(item.unitPrice * item.quantity)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Notes */}
                  {orderNotes && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase mb-1">
                            Observação do Pedido
                          </p>
                          <p className="text-sm text-blue-800 dark:text-blue-300">
                            {orderNotes}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observations Summary */}
                  {(itemsWithNotes.length > 0 || orderNotes) && (
                    <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <p className="text-xs font-medium">Resumo das Observações</p>
                      </div>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {itemsWithNotes.length > 0 && (
                          <li>• {itemsWithNotes.length} item(ns) com observação</li>
                        )}
                        {orderNotes && (
                          <li>• Observação geral do pedido</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="p-4 border-t bg-muted/30">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">Total do Pedido</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(orderTotal)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowOrderConfirmModal(false)}
                    className="h-11"
                  >
                    Revisar
                  </Button>
                  <Button 
                    onClick={handleSubmitOrder}
                    disabled={submitting}
                    className="h-11"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Confirmar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Size Modal */}
        {sizeModalProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-xl w-full max-w-sm p-5 space-y-4">
              <h3 className="font-bold">{sizeModalProduct.name}</h3>
              <p className="text-sm text-muted-foreground">Escolha o tamanho</p>
              <div className="space-y-2">
                {sizeModalProduct.price_small != null && sizeModalProduct.price_small > 0 && (
                  <Button
                    variant="outline"
                    className="w-full justify-between h-12"
                    onClick={() => addToCartWithSize(sizeModalProduct, 'small')}
                  >
                    <span>Pequeno (P)</span>
                    <span className="font-bold text-primary">{formatCurrency(sizeModalProduct.price_small)}</span>
                  </Button>
                )}
                {sizeModalProduct.price_medium != null && sizeModalProduct.price_medium > 0 && (
                  <Button
                    variant="outline"
                    className="w-full justify-between h-12"
                    onClick={() => addToCartWithSize(sizeModalProduct, 'medium')}
                  >
                    <span>Médio (M)</span>
                    <span className="font-bold text-primary">{formatCurrency(sizeModalProduct.price_medium)}</span>
                  </Button>
                )}
                {sizeModalProduct.price_large != null && sizeModalProduct.price_large > 0 && (
                  <Button
                    variant="outline"
                    className="w-full justify-between h-12"
                    onClick={() => addToCartWithSize(sizeModalProduct, 'large')}
                  >
                    <span>Grande (G)</span>
                    <span className="font-bold text-primary">{formatCurrency(sizeModalProduct.price_large)}</span>
                  </Button>
                )}
              </div>
              <Button variant="ghost" className="w-full" onClick={() => setSizeModalProduct(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // Main View - Tables/Comandas
  return (
    <motion.div 
      key="main-tables"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex flex-col"
    >
      {/* Header */}
      <header className="bg-gradient-to-r from-primary via-primary to-primary/90 text-primary-foreground shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {!isPublicAccess && (
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-white/20 rounded-xl transition-all"
                onClick={() => setView('login')}
              >
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <div>
              <span className="font-bold text-lg tracking-tight">{restaurant?.name || 'Garçom'}</span>
              {selectedWaiter && (
                <p className="text-xs opacity-90 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {selectedWaiter.name}
                </p>
              )}
            </div>
          </div>
          {(isPublicAccess && onExternalLogout) && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-white/20 rounded-xl"
              onClick={onExternalLogout}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => setActiveTab('mesas')}
            className={`flex-1 py-3.5 text-center font-semibold transition-all relative ${
              activeTab === 'mesas' 
                ? 'text-primary-foreground' 
                : 'text-primary-foreground/60 hover:text-primary-foreground/80'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4" />
              Mesas
            </span>
            {activeTab === 'mesas' && (
              <motion.div 
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-4 right-4 h-0.5 bg-white rounded-full" 
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('comandas')}
            className={`flex-1 py-3.5 text-center font-semibold transition-all relative ${
              activeTab === 'comandas' 
                ? 'text-primary-foreground' 
                : 'text-primary-foreground/60 hover:text-primary-foreground/80'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Comandas
            </span>
            {activeTab === 'comandas' && (
              <motion.div 
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-4 right-4 h-0.5 bg-white rounded-full" 
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'mesas' ? "Buscar mesa..." : "Buscar comanda..."}
            value={tableSearchTerm}
            onChange={(e) => setTableSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-base shadow-inner"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-sm shadow-emerald-500/30" />
          <span className="text-slate-600 dark:text-slate-400 font-medium">Livres</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-sm shadow-rose-500/30" />
          <span className="text-slate-600 dark:text-slate-400 font-medium">Ocupadas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-sm shadow-amber-500/30" />
          <span className="text-slate-600 dark:text-slate-400 font-medium">Fechando</span>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === 'mesas' ? (
          <motion.div 
            key="tables-grid"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.03 },
              },
            }}
            className="p-4 grid grid-cols-3 gap-3"
          >
            {filteredTables.map((table, index) => {
              const hasReadyOrder = tableReadyOrders[table.id];
              
              return (
                <motion.button
                  key={table.id}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.9 },
                    visible: { 
                      opacity: 1, 
                      y: 0, 
                      scale: 1,
                      transition: {
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                      },
                    },
                  }}
                  whileHover={{ scale: 1.05, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTableClick(table)}
                  className={`relative rounded-2xl p-4 min-h-[100px] flex flex-col justify-between text-left shadow-lg ${
                    table.status === 'available' 
                      ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/25' 
                      : table.status === 'closing' 
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/25' 
                        : 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-rose-500/25'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-lg drop-shadow-sm">Mesa {table.number}</span>
                    {table.status !== 'available' && (
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-2 h-2 rounded-full bg-white/80"
                      />
                    )}
                  </div>
                  {hasReadyOrder && (
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Badge className="bg-white text-emerald-700 text-xs font-bold w-fit shadow-sm">
                        🔔 Pronto!
                      </Badge>
                    </motion.div>
                  )}
                  {table.status === 'available' && (
                    <span className="text-xs text-white/80 font-medium">Disponível</span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div 
            key="tabs-grid"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.03 },
              },
            }}
            className="p-4 grid grid-cols-3 gap-3"
          >
            {/* Create New Tab Button */}
            <motion.button
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.9 },
                visible: { 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: {
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                  },
                },
              }}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setNewTabCustomerName('');
                setNewTabCustomerPhone('');
                setShowCreateTabModal(true);
              }}
              className="relative rounded-2xl p-4 min-h-[100px] flex flex-col items-center justify-center text-center border-2 border-dashed border-primary/40 bg-primary/5"
            >
              <motion.div 
                whileHover={{ rotate: 90 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2"
              >
                <Plus className="w-6 h-6 text-primary" />
              </motion.div>
              <span className="font-semibold text-sm text-primary">Nova</span>
            </motion.button>
            
            {tabs.filter(tab => {
              if (!tableSearchTerm) return true;
              return tab.number.toString().includes(tableSearchTerm) ||
                tab.customer_name?.toLowerCase().includes(tableSearchTerm.toLowerCase());
            }).map((tab, index) => (
              <motion.button
                key={tab.id}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.9 },
                  visible: { 
                    opacity: 1, 
                    y: 0, 
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                    },
                  },
                }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTabClick(tab)}
                className={`relative rounded-2xl p-4 min-h-[100px] flex flex-col justify-between text-left shadow-lg ${
                  tab.status === 'available' 
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/25' 
                    : tab.status === 'closing' 
                      ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/25' 
                      : 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-rose-500/25'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="font-bold text-lg drop-shadow-sm">#{tab.number}</span>
                  {tab.status !== 'available' && (
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2 h-2 rounded-full bg-white/80"
                    />
                  )}
                </div>
                {tab.customer_name && (
                  <p className="text-xs text-white/90 truncate font-medium flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {tab.customer_name}
                  </p>
                )}
                {tab.status === 'available' && !tab.customer_name && (
                  <span className="text-xs text-white/80 font-medium">Disponível</span>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </ScrollArea>

      {/* Bottom Button */}
      <div className="p-4 border-t bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <Button 
          className="w-full h-14 gap-3 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
          onClick={() => handleStartDelivery('delivery')}
        >
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Bike className="w-5 h-5" />
          </div>
          Delivery / Para Levar
        </Button>
      </div>

      {/* Table Action Modal */}
      <AnimatePresence>
        {showTableModal && modalTable && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
            onClick={() => setShowTableModal(false)}
          >
            <motion.div 
              initial={{ y: 300, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-background w-full max-w-md rounded-t-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-bold">Mesa {modalTable.number}</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowTableModal(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="p-4 flex items-center gap-3 border-b">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-muted-foreground text-sm">Total: </span>
                  <span className="text-lg font-bold">{formatCurrency(tableTotal)}</span>
                </div>
              </div>
              
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
                }}
                className="p-4 space-y-2"
              >
                <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 justify-start gap-3"
                    onClick={() => handleViewOrders(modalTable)}
                  >
                    <Eye className="w-4 h-4" />
                    Ver pedidos
                  </Button>
                </motion.div>
                
                <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 justify-start gap-3"
                    onClick={() => {
                      handleViewOrders(modalTable);
                      setTimeout(() => handlePrintReceipt(), 500);
                    }}
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir conferência
                  </Button>
                </motion.div>
                
                <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
                  <Button 
                    variant="outline" 
                    className="w-full h-12 justify-start gap-3"
                    onClick={async () => {
                      await handleViewOrders(modalTable);
                      setTableTotal(tableTotal);
                      setShowCloseModal(true);
                    }}
                  >
                    <DollarSign className="w-4 h-4" />
                    Fechar conta
                  </Button>
                </motion.div>
                
                <motion.div variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }}>
                  <Button 
                    className="w-full h-12 justify-start gap-3"
                    onClick={() => handleNewOrder(modalTable)}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Novo pedido
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Size Modal */}
      {sizeModalProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Escolha o tamanho</h3>
            <p className="text-sm text-gray-600">{sizeModalProduct.name}</p>
            <div className="space-y-2">
              {sizeModalProduct.price_small != null && (
                <Button
                  variant="outline"
                  className="w-full justify-between h-14"
                  onClick={() => addToCartWithSize(sizeModalProduct, 'small')}
                >
                  <span>Pequeno (P)</span>
                  <span className="font-bold text-[#0ea5e9]">{formatCurrency(sizeModalProduct.price_small)}</span>
                </Button>
              )}
              {sizeModalProduct.price_medium != null && (
                <Button
                  variant="outline"
                  className="w-full justify-between h-14"
                  onClick={() => addToCartWithSize(sizeModalProduct, 'medium')}
                >
                  <span>Médio (M)</span>
                  <span className="font-bold text-[#0ea5e9]">{formatCurrency(sizeModalProduct.price_medium)}</span>
                </Button>
              )}
              {sizeModalProduct.price_large != null && (
                <Button
                  variant="outline"
                  className="w-full justify-between h-14"
                  onClick={() => addToCartWithSize(sizeModalProduct, 'large')}
                >
                  <span>Grande (G)</span>
                  <span className="font-bold text-[#0ea5e9]">{formatCurrency(sizeModalProduct.price_large)}</span>
                </Button>
              )}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setSizeModalProduct(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Tab Customer Modal */}
      {showTabCustomerModal && pendingTab && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="bg-background w-full max-w-md rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-bold">Comanda #{pendingTab.number}</h3>
                <p className="text-sm text-muted-foreground">Dados do cliente</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setShowTabCustomerModal(false);
                  setPendingTab(null);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome do Cliente *
                </Label>
                <Input
                  placeholder="Nome para identificação"
                  value={tabCustomerName}
                  onChange={(e) => setTabCustomerName(e.target.value)}
                  className="h-12"
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone (opcional)
                </Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={tabCustomerPhone}
                  onChange={(e) => setTabCustomerPhone(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>
            
            <div className="p-4 border-t space-y-2">
              <Button 
                className="w-full h-12"
                onClick={handleSaveTabCustomer}
                disabled={savingTabCustomer || !tabCustomerName.trim()}
              >
                {savingTabCustomer ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <PlusCircle className="w-4 h-4 mr-2" />
                )}
                Abrir Comanda
              </Button>
              <Button 
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowTabCustomerModal(false);
                  setPendingTab(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Tab Modal */}
      {showCreateTabModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="bg-background w-full max-w-md rounded-t-2xl overflow-hidden animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-bold">Nova Comanda</h3>
                <p className="text-sm text-muted-foreground">Dados do cliente</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowCreateTabModal(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome do Cliente *
                </Label>
                <Input
                  placeholder="Nome para identificação"
                  value={newTabCustomerName}
                  onChange={(e) => setNewTabCustomerName(e.target.value)}
                  className="h-12"
                  autoFocus
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone (opcional)
                </Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={newTabCustomerPhone}
                  onChange={(e) => setNewTabCustomerPhone(e.target.value)}
                  className="h-12"
                />
              </div>
            </div>
            
            <div className="p-4 border-t space-y-2">
              <Button 
                className="w-full h-12"
                onClick={handleCreateNewTab}
                disabled={creatingTab || !newTabCustomerName.trim()}
              >
                {creatingTab ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <PlusCircle className="w-4 h-4 mr-2" />
                )}
                Criar Comanda
              </Button>
              <Button 
                variant="ghost"
                className="w-full"
                onClick={() => setShowCreateTabModal(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
