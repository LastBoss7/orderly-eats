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
import { toast } from 'sonner';
import { usePrintSettings } from '@/hooks/usePrintSettings';
import { WaiterTableOrders } from '@/components/waiter/WaiterTableOrders';
import { WaiterTabOrders } from '@/components/waiter/WaiterTabOrders';
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
  Home,
  Receipt,
  Eye,
} from 'lucide-react';

interface Waiter {
  id: string;
  name: string;
  status: string;
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
}

type ProductSize = 'small' | 'medium' | 'large';

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
  size?: ProductSize | null;
  unitPrice: number;
}

interface Order {
  id: string;
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
  order_items?: OrderItem[];
  tables?: { number: number } | null;
  tabs?: { number: number; customer_name: string | null } | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  product_price: number;
  notes: string | null;
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

type AppView = 'login' | 'tables' | 'comandas' | 'order' | 'order-detail' | 'delivery' | 'delivery-order' | 'table-orders' | 'tab-orders';
type OrderMode = 'table' | 'delivery' | 'takeaway' | 'tab';

export default function WaiterApp() {
  const { restaurant, signOut } = useAuth();
  const { shouldAutoPrint } = usePrintSettings();

  // States
  const [view, setView] = useState<AppView>('login');
  const [activeTab, setActiveTab] = useState<'mesas' | 'comandas'>('mesas');
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [selectedWaiter, setSelectedWaiter] = useState<Waiter | null>(null);
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
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [editingItemNotes, setEditingItemNotes] = useState<string | null>(null);
  
  // Size selection modal
  const [sizeModalProduct, setSizeModalProduct] = useState<Product | null>(null);
  
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
        const [waitersRes, tablesRes, tabsRes, categoriesRes, productsRes] = await Promise.all([
          supabase.from('waiters').select('*').eq('status', 'active').order('name'),
          supabase.from('tables').select('*').order('number'),
          supabase.from('tabs').select('*').order('number'),
          supabase.from('categories').select('*').order('sort_order'),
          supabase.from('products').select('*').eq('is_available', true).order('name'),
        ]);

        setWaiters(waitersRes.data || []);
        setTables((tablesRes.data || []) as Table[]);
        setTabs((tabsRes.data || []) as Tab[]);
        setCategories(categoriesRes.data || []);
        setProducts(productsRes.data || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurant?.id]);

  // Fetch active orders
  const fetchActiveOrders = useCallback(async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          tables (number)
        `)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActiveOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    if (activeTab === 'comandas') {
      fetchActiveOrders();
    }
  }, [activeTab, fetchActiveOrders]);

  // Realtime subscription for orders
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel('waiter-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchActiveOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, fetchActiveOrders]);

  // Realtime subscription for tables
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel('waiter-tables')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        async () => {
          const { data } = await supabase.from('tables').select('*').order('number');
          setTables((data || []) as Table[]);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tabs' },
        async () => {
          const { data } = await supabase.from('tabs').select('*').order('number');
          setTabs((data || []) as Tab[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id]);

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

  // Handle customer phone search
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

  const handleSelectWaiter = (waiter: Waiter) => {
    setSelectedWaiter(waiter);
    setView('tables');
    toast.success(`Bem-vindo, ${waiter.name}!`);
  };

  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
    setOrderMode('table');
    setView('order');
    setCart([]);
    setSearchTerm('');
    setSelectedCategory(null);
    setOrderNotes('');
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
    // Validate required fields
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
    if (!product.has_sizes || !size) {
      return product.price;
    }
    switch (size) {
      case 'small': return product.price_small ?? product.price;
      case 'medium': return product.price_medium ?? product.price;
      case 'large': return product.price_large ?? product.price;
      default: return product.price;
    }
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
    const cartKey = size ? `${product.id}-${size}` : product.id;
    
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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSubmitOrder = async () => {
    if (orderMode === 'table' && (!selectedTable || cart.length === 0)) return;
    if (orderMode === 'tab' && (!selectedTab || cart.length === 0)) return;
    if ((orderMode === 'delivery' || orderMode === 'takeaway') && cart.length === 0) return;

    setSubmitting(true);

    try {
      // Note: Table/Tab occupation is now handled automatically by database trigger
      
      const autoPrint = shouldAutoPrint(orderMode === 'table' || orderMode === 'tab' ? 'table' : 'delivery');

      // Build address string for delivery
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

      // Create or update customer if delivery/takeaway
      let customerId = selectedCustomer?.id || null;
      if ((orderMode === 'delivery' || orderMode === 'takeaway') && !selectedCustomer) {
        // Create new customer
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

        if (customerError) {
          console.error('Error creating customer:', customerError);
        } else {
          customerId = newCustomer?.id;
        }
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant?.id,
          table_id: orderMode === 'table' ? selectedTable?.id : null,
          tab_id: orderMode === 'tab' ? selectedTab?.id : null,
          order_type: orderMode === 'tab' ? 'table' : orderMode, // Store 'tab' as 'table' type
          status: 'pending',
          print_status: autoPrint ? 'pending' : 'disabled',
          total: orderTotal,
          notes: orderNotes || null,
          customer_id: customerId,
          customer_name: orderMode === 'tab' ? selectedTab?.customer_name : (orderMode !== 'table' ? deliveryForm.customerName : null),
          delivery_address: orderMode === 'delivery' ? fullAddress : null,
          delivery_phone: orderMode !== 'table' && orderMode !== 'tab' ? deliveryForm.customerPhone : null,
          delivery_fee: orderMode === 'delivery' ? deliveryForm.deliveryFee : 0,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        restaurant_id: restaurant?.id,
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.size 
          ? `${item.product.name} (${getSizeLabel(item.size)})`
          : item.product.name,
        product_price: item.unitPrice,
        quantity: item.quantity,
        notes: item.notes || null,
        product_size: item.size || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      const successMessage = orderMode === 'table'
        ? `Pedido da Mesa ${selectedTable?.number} enviado!`
        : orderMode === 'tab'
          ? `Pedido da Comanda #${selectedTab?.number} enviado!`
          : orderMode === 'delivery'
            ? `Pedido delivery para ${deliveryForm.customerName} enviado!`
            : `Pedido para levar de ${deliveryForm.customerName} enviado!`;

      toast.success(successMessage);

      // Refresh tables and tabs
      const [tablesRes, tabsRes] = await Promise.all([
        supabase.from('tables').select('*').order('number'),
        supabase.from('tabs').select('*').order('number'),
      ]);
      setTables((tablesRes.data || []) as Table[]);
      setTabs((tabsRes.data || []) as Tab[]);

      // Go back to tables
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

  // Get table with ready order
  const getTableWithReadyOrder = (tableId: string) => {
    return activeOrders.find(o => o.table_id === tableId && o.status === 'ready');
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      available: 'Livre',
      occupied: 'Ocupada',
      closing: 'Fechando',
      pending: 'Pendente',
      preparing: 'Preparando',
      ready: 'Pronto',
      delivered: 'Entregue',
    };
    return labels[status] || status;
  };

  const getOrderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      table: 'Mesa',
      delivery: 'Delivery',
      takeaway: 'Para Levar',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e3a5f]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-white mx-auto mb-4" />
          <p className="text-white/80">Carregando...</p>
        </div>
      </div>
    );
  }

  // Table Orders View (View orders, close table, print)
  if (view === 'table-orders' && selectedTable) {
    return (
      <WaiterTableOrders
        table={selectedTable}
        onBack={() => { setView('tables'); setSelectedTable(null); }}
        onTableClosed={() => { setView('tables'); setSelectedTable(null); }}
      />
    );
  }

  // Tab Orders View (View orders, close tab, print)
  if (view === 'tab-orders' && selectedTab) {
    return (
      <WaiterTabOrders
        tab={selectedTab}
        onBack={() => { setView('tables'); setSelectedTab(null); }}
        onTabClosed={() => { setView('tables'); setSelectedTab(null); }}
      />
    );
  }

  // Login / Waiter Selection View
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#1e3a5f] flex flex-col">
        <header className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-400 text-[#1e3a5f] mb-4">
            <ChefHat className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white">{restaurant?.name}</h1>
          <p className="text-white/70 mt-2">Selecione seu perfil para começar</p>
        </header>

        <div className="flex-1 p-4">
          <div className="max-w-md mx-auto space-y-3">
            {waiters.map((waiter) => (
              <button
                key={waiter.id}
                onClick={() => handleSelectWaiter(waiter)}
                className="w-full flex items-center gap-4 p-4 bg-white/10 rounded-xl border border-white/20 hover:bg-white/20 transition-all active:scale-[0.98]"
              >
                <Avatar className="h-14 w-14 border-2 border-yellow-400">
                  <AvatarFallback className="bg-yellow-400 text-[#1e3a5f] text-lg font-bold">
                    {getInitials(waiter.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-lg text-white">{waiter.name}</p>
                  <p className="text-sm text-white/60">Garçom</p>
                </div>
                <ChefHat className="w-5 h-5 text-yellow-400" />
              </button>
            ))}

            {waiters.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-white/30 mb-4" />
                <p className="text-white/60">Nenhum garçom cadastrado</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 text-center">
          <Button variant="ghost" size="sm" onClick={signOut} className="text-white/70 hover:text-white hover:bg-white/10">
            <LogOut className="w-4 h-4 mr-2" />
            Sair do sistema
          </Button>
        </div>
      </div>
    );
  }

  // Delivery Form View
  if (view === 'delivery') {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        <header className="sticky top-0 bg-[#1e3a5f] text-white p-4 z-10">
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
              
              {/* Customer Results */}
              {customers.length > 0 && (
                <div className="mt-2 border rounded-lg divide-y">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full p-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-medium text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.phone}</p>
                      {customer.address && (
                        <p className="text-xs text-gray-400 truncate">{customer.address}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
              
              {searchingCustomer && (
                <div className="mt-2 flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
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
                    maxLength={100}
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-gray-600">Telefone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="(00) 00000-0000"
                      value={deliveryForm.customerPhone}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                      className="pl-10 bg-gray-50"
                      maxLength={20}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Address (only for delivery) */}
            {orderMode === 'delivery' && (
              <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereço de Entrega
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm text-gray-600">CEP</Label>
                    <Input
                      placeholder="00000-000"
                      value={deliveryForm.cep}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, cep: e.target.value }))}
                      className="bg-gray-50"
                      maxLength={10}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-600">Endereço *</Label>
                    <Input
                      placeholder="Rua, Avenida..."
                      value={deliveryForm.address}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, address: e.target.value }))}
                      className="bg-gray-50"
                      maxLength={200}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-gray-600">Número</Label>
                      <Input
                        placeholder="Nº"
                        value={deliveryForm.number}
                        onChange={(e) => setDeliveryForm(prev => ({ ...prev, number: e.target.value }))}
                        className="bg-gray-50"
                        maxLength={20}
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Complemento</Label>
                      <Input
                        placeholder="Apto, Bloco..."
                        value={deliveryForm.complement}
                        onChange={(e) => setDeliveryForm(prev => ({ ...prev, complement: e.target.value }))}
                        className="bg-gray-50"
                        maxLength={50}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-600">Bairro</Label>
                    <Input
                      placeholder="Bairro"
                      value={deliveryForm.neighborhood}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, neighborhood: e.target.value }))}
                      className="bg-gray-50"
                      maxLength={100}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-600">Cidade</Label>
                    <Input
                      placeholder="Cidade"
                      value={deliveryForm.city}
                      onChange={(e) => setDeliveryForm(prev => ({ ...prev, city: e.target.value }))}
                      className="bg-gray-50"
                      maxLength={100}
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm text-gray-600">Taxa de Entrega</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <Input
                        type="number"
                        placeholder="0,00"
                        value={deliveryForm.deliveryFee || ''}
                        onChange={(e) => setDeliveryForm(prev => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                        className="pl-10 bg-gray-50"
                        min={0}
                        step={0.01}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Continue Button */}
        <div className="p-4 bg-white border-t">
          <Button
            className="w-full h-14 bg-[#2d5a87] hover:bg-[#1e3a5f] text-white gap-2 text-base font-semibold"
            onClick={handleProceedToOrder}
          >
            <ClipboardList className="w-5 h-5" />
            Adicionar Produtos
          </Button>
        </div>
      </div>
    );
  }

  // Order Detail View
  if (view === 'order-detail' && selectedOrder) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        <header className="sticky top-0 bg-[#1e3a5f] text-white p-4 z-10">
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
                {selectedOrder.order_type === 'table' 
                  ? `Mesa ${selectedOrder.tables?.number || '-'}`
                  : selectedOrder.customer_name || 'Pedido'}
              </h1>
              <p className="text-xs opacity-80">
                {getOrderTypeLabel(selectedOrder.order_type || 'table')} • {formatTime(selectedOrder.created_at)}
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4">
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge className={`${
                  selectedOrder.status === 'ready' ? 'bg-green-500' :
                  selectedOrder.status === 'preparing' ? 'bg-orange-500' : 'bg-yellow-500'
                } text-white border-0 text-sm px-3 py-1`}>
                  {getStatusLabel(selectedOrder.status)}
                </Badge>
                <Badge variant="outline" className="text-sm">
                  {getOrderTypeLabel(selectedOrder.order_type || 'table')}
                </Badge>
              </div>
              <span className="text-xl font-bold text-[#1e3a5f]">
                {formatCurrency(selectedOrder.total || 0)}
              </span>
            </div>

            {/* Customer info for delivery/takeaway */}
            {selectedOrder.order_type !== 'table' && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-1">
                {selectedOrder.customer_name && (
                  <p className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    {selectedOrder.customer_name}
                  </p>
                )}
                {selectedOrder.delivery_phone && (
                  <p className="text-sm flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {selectedOrder.delivery_phone}
                  </p>
                )}
                {selectedOrder.delivery_address && (
                  <p className="text-sm flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {selectedOrder.delivery_address}
                  </p>
                )}
                {selectedOrder.delivery_fee && selectedOrder.delivery_fee > 0 && (
                  <p className="text-sm text-gray-500">
                    Taxa de entrega: {formatCurrency(selectedOrder.delivery_fee)}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              {selectedOrder.order_items?.map((item) => (
                <div key={item.id} className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{item.quantity}x</span>
                      <span>{item.product_name}</span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-gray-500 ml-6">
                        Obs: {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="text-gray-500">
                    {formatCurrency(item.product_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {selectedOrder.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {selectedOrder.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Delivery Order View (Add products)
  if (view === 'delivery-order') {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        <header className="sticky top-0 bg-[#1e3a5f] text-white p-4 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => { setView('delivery'); }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold">
                {orderMode === 'delivery' ? 'Delivery' : 'Para Levar'} - {deliveryForm.customerName}
              </h1>
              <p className="text-xs opacity-80">
                {cart.length > 0 ? `${cart.length} itens no pedido` : 'Adicionar itens'}
              </p>
            </div>
          </div>
        </header>

        {/* Search */}
        <div className="p-3 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-gray-50 border-gray-200"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-3 py-2 bg-white border-b overflow-x-auto">
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              className={`h-9 px-4 shrink-0 ${selectedCategory === null ? 'bg-[#2d5a87] hover:bg-[#1e3a5f]' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                className={`h-9 px-4 whitespace-nowrap shrink-0 ${selectedCategory === category.id ? 'bg-[#2d5a87] hover:bg-[#1e3a5f]' : ''}`}
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
              const productCartItems = cart.filter(item => item.product.id === product.id);
              const totalQuantity = productCartItems.reduce((sum, item) => sum + item.quantity, 0);
              
              return (
                <button
                  key={product.id}
                  className={`relative flex items-center justify-between p-4 bg-white rounded-xl border-2 text-left transition-all active:scale-[0.99] ${
                    totalQuantity > 0 ? 'border-[#2d5a87] bg-[#2d5a87]/5' : 'border-transparent shadow-sm'
                  }`}
                  onClick={() => handleProductClick(product)}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium line-clamp-1 text-gray-900">{product.name}</p>
                      {product.has_sizes && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded">P/M/G</span>
                      )}
                    </div>
                    <p className="text-[#2d5a87] font-bold">
                      {product.has_sizes 
                        ? `A partir de ${formatCurrency(Math.min(
                            product.price_small ?? Infinity,
                            product.price_medium ?? Infinity,
                            product.price_large ?? Infinity
                          ))}`
                        : formatCurrency(product.price)
                      }
                    </p>
                  </div>
                  
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all ${
                    totalQuantity > 0 
                      ? 'bg-[#2d5a87] text-white' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {totalQuantity > 0 ? (
                      <span className="text-lg font-bold">{totalQuantity}</span>
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t shadow-lg">
            <ScrollArea className="max-h-48 p-3">
              <div className="space-y-2">
                {cart.map((item, index) => {
                  const cartItemKey = `${item.product.id}-${item.size || 'default'}-${index}`;
                  const editKey = `${item.product.id}-${item.size || 'default'}`;
                  return (
                    <div key={cartItemKey} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-gray-900">
                            {item.product.name}
                            {item.size && (
                              <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                {getSizeLabel(item.size)}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(item.unitPrice)} cada
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={(e) => { e.stopPropagation(); updateQuantity(item.product.id, item.size, -1); }}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-bold">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={(e) => { e.stopPropagation(); updateQuantity(item.product.id, item.size, 1); }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-red-500"
                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.product.id, item.size); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {editingItemNotes === editKey ? (
                        <Input
                          placeholder="Observações do item..."
                          value={item.notes}
                          onChange={(e) => updateItemNotes(item.product.id, item.size, e.target.value)}
                          onBlur={() => setEditingItemNotes(null)}
                          autoFocus
                          className="h-9 text-sm"
                        />
                      ) : (
                        <button
                          onClick={() => setEditingItemNotes(editKey)}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {item.notes || 'Adicionar observação'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="p-3 pt-0">
              <Textarea
                placeholder="Observações gerais do pedido..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="mb-3 min-h-[60px]"
              />
              
              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                {orderMode === 'delivery' && deliveryForm.deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taxa de entrega</span>
                    <span>{formatCurrency(deliveryForm.deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-1 border-t">
                  <span>Total</span>
                  <span className="text-[#1e3a5f]">{formatCurrency(orderTotal)}</span>
                </div>
              </div>

              <Button
                className="w-full h-14 text-lg gap-2 bg-[#2d5a87] hover:bg-[#1e3a5f]"
                disabled={submitting}
                onClick={handleSubmitOrder}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Pedido
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Order View (New Order - Table or Tab)
  if (view === 'order') {
    const orderTitle = orderMode === 'tab' 
      ? `Comanda #${selectedTab?.number}${selectedTab?.customer_name ? ` - ${selectedTab.customer_name}` : ''}`
      : `Mesa ${selectedTable?.number}`;
      
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        <header className="sticky top-0 bg-[#1e3a5f] text-white p-4 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => { setView('tables'); setCart([]); setSelectedTab(null); }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold">{orderTitle}</h1>
              <p className="text-xs opacity-80">
                {cart.length > 0 ? `${cart.length} itens no pedido` : 'Adicionar itens'}
              </p>
            </div>
          </div>
        </header>

        {/* Search */}
        <div className="p-3 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 bg-gray-50 border-gray-200"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-3 py-2 bg-white border-b overflow-x-auto">
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              className={`h-9 px-4 shrink-0 ${selectedCategory === null ? 'bg-[#2d5a87] hover:bg-[#1e3a5f]' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              Todos
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                className={`h-9 px-4 whitespace-nowrap shrink-0 ${selectedCategory === category.id ? 'bg-[#2d5a87] hover:bg-[#1e3a5f]' : ''}`}
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
              const productCartItems = cart.filter(item => item.product.id === product.id);
              const totalQuantity = productCartItems.reduce((sum, item) => sum + item.quantity, 0);
              
              return (
                <button
                  key={product.id}
                  className={`relative flex items-center justify-between p-4 bg-white rounded-xl border-2 text-left transition-all active:scale-[0.99] ${
                    totalQuantity > 0 ? 'border-[#2d5a87] bg-[#2d5a87]/5' : 'border-transparent shadow-sm'
                  }`}
                  onClick={() => handleProductClick(product)}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium line-clamp-1 text-gray-900">{product.name}</p>
                      {product.has_sizes && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded">P/M/G</span>
                      )}
                    </div>
                    <p className="text-[#2d5a87] font-bold">
                      {product.has_sizes 
                        ? `A partir de ${formatCurrency(Math.min(
                            product.price_small ?? Infinity,
                            product.price_medium ?? Infinity,
                            product.price_large ?? Infinity
                          ))}`
                        : formatCurrency(product.price)
                      }
                    </p>
                  </div>
                  
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all ${
                    totalQuantity > 0 
                      ? 'bg-[#2d5a87] text-white' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {totalQuantity > 0 ? (
                      <span className="text-lg font-bold">{totalQuantity}</span>
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="sticky bottom-0 bg-white border-t shadow-lg">
            <ScrollArea className="max-h-48 p-3">
              <div className="space-y-2">
                {cart.map((item, index) => {
                  const cartItemKey = `${item.product.id}-${item.size || 'default'}-${index}`;
                  const editKey = `${item.product.id}-${item.size || 'default'}`;
                  return (
                    <div key={cartItemKey} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-gray-900">
                            {item.product.name}
                            {item.size && (
                              <span className="ml-1 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                {getSizeLabel(item.size)}
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(item.unitPrice)} cada
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={(e) => { e.stopPropagation(); updateQuantity(item.product.id, item.size, -1); }}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center font-bold">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            onClick={(e) => { e.stopPropagation(); updateQuantity(item.product.id, item.size, 1); }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-red-500"
                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.product.id, item.size); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {editingItemNotes === editKey ? (
                        <Input
                          placeholder="Observações do item..."
                          value={item.notes}
                          onChange={(e) => updateItemNotes(item.product.id, item.size, e.target.value)}
                          onBlur={() => setEditingItemNotes(null)}
                          autoFocus
                          className="h-9 text-sm"
                        />
                      ) : (
                        <button
                          onClick={() => setEditingItemNotes(editKey)}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          {item.notes || 'Adicionar observação'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="p-3 pt-0">
              <Textarea
                placeholder="Observações gerais do pedido..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="mb-3 min-h-[60px]"
              />
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-xl font-bold text-[#1e3a5f]">{formatCurrency(cartTotal)}</p>
                </div>
                <Button
                  className="h-14 px-8 text-lg gap-2 bg-[#2d5a87] hover:bg-[#1e3a5f]"
                  disabled={submitting}
                  onClick={handleSubmitOrder}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Enviar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Main View - Tables/Comandas (Anota AI Style)
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setView('login')}
            >
              <Menu className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center">
                <ChefHat className="w-4 h-4 text-[#1e3a5f]" />
              </div>
              <span className="font-semibold">Mapa de mesas e comandas</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex">
          <button
            onClick={() => { setActiveTab('mesas'); fetchActiveOrders(); }}
            className={`flex-1 py-3 text-center font-semibold transition-all ${
              activeTab === 'mesas' 
                ? 'bg-[#2d5a87] text-white' 
                : 'bg-[#1e3a5f] text-white/70 hover:text-white'
            }`}
          >
            Mesas
          </button>
          <button
            onClick={() => { setActiveTab('comandas'); fetchActiveOrders(); }}
            className={`flex-1 py-3 text-center font-semibold transition-all ${
              activeTab === 'comandas' 
                ? 'bg-[#2d5a87] text-white' 
                : 'bg-[#1e3a5f] text-white/70 hover:text-white'
            }`}
          >
            Comandas
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="p-3 bg-white border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Buscar por nome da mesa"
            value={tableSearchTerm}
            onChange={(e) => setTableSearchTerm(e.target.value)}
            className="pl-10 h-12 bg-white border-gray-200 text-base"
          />
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 bg-white border-b flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="text-gray-600">Livres</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-gray-600">Ocupadas</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <span className="text-gray-600">Em pagamento</span>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === 'mesas' ? (
          <div className="p-3 grid grid-cols-2 gap-3">
            {filteredTables.map((table) => {
              const readyOrder = getTableWithReadyOrder(table.id);
              const hasReadyOrder = readyOrder !== undefined;
              const isOccupied = table.status === 'occupied' || table.status === 'closing';
              
              return (
                <div
                  key={table.id}
                  className={`relative rounded-xl overflow-hidden shadow-sm ${
                    hasReadyOrder ? 'ring-2 ring-orange-500' : ''
                  }`}
                >
                  {/* Table Header */}
                  <div 
                    className={`p-4 ${
                      table.status === 'available' ? 'bg-green-600' :
                      table.status === 'closing' ? 'bg-yellow-500' : 'bg-red-500'
                    } text-white`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xl">Mesa {table.number}</span>
                      {hasReadyOrder && (
                        <Badge className="bg-white/20 text-white text-xs">
                          Pronto!
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm opacity-80">
                      {table.status === 'available' ? 'Livre' : 
                       table.status === 'closing' ? 'Fechando conta' : 'Ocupada'}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="bg-white p-2 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSelectTable(table)}
                      className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 text-blue-700 active:bg-blue-100"
                    >
                      <Plus className="w-5 h-5 mb-1" />
                      <span className="text-xs font-medium">Novo Pedido</span>
                    </button>
                    <button
                      onClick={() => { setSelectedTable(table); setView('table-orders'); }}
                      className={`flex flex-col items-center justify-center p-3 rounded-lg ${
                        isOccupied 
                          ? 'bg-green-50 text-green-700 active:bg-green-100' 
                          : 'bg-gray-50 text-gray-400'
                      }`}
                      disabled={!isOccupied}
                    >
                      <Receipt className="w-5 h-5 mb-1" />
                      <span className="text-xs font-medium">
                        {isOccupied ? 'Ver/Fechar' : 'Sem pedidos'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {/* Tabs Grid */}
            {tabs.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {tabs.filter(tab => {
                  if (!tableSearchTerm) return true;
                  return tab.number.toString().includes(tableSearchTerm) ||
                    tab.customer_name?.toLowerCase().includes(tableSearchTerm.toLowerCase());
                }).map((tab) => {
                  const isOccupied = tab.status === 'occupied' || tab.status === 'closing';
                  
                  return (
                    <div
                      key={tab.id}
                      className="relative rounded-xl overflow-hidden shadow-sm"
                    >
                      {/* Tab Header */}
                      <div 
                        className={`p-4 ${
                          tab.status === 'available' ? 'bg-green-600' :
                          tab.status === 'closing' ? 'bg-yellow-500' : 'bg-red-500'
                        } text-white`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xl">#{tab.number}</span>
                        </div>
                        {tab.customer_name && (
                          <p className="text-sm flex items-center gap-1 mt-1">
                            <User className="w-3 h-3" />
                            {tab.customer_name}
                          </p>
                        )}
                        <span className="text-xs opacity-80">
                          {tab.status === 'available' ? 'Livre' : 
                           tab.status === 'closing' ? 'Fechando' : 'Ocupada'}
                        </span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="bg-white p-2 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setSelectedTab(tab);
                            setOrderMode('tab');
                            setView('order');
                          }}
                          className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 text-blue-700 active:bg-blue-100"
                        >
                          <Plus className="w-5 h-5 mb-1" />
                          <span className="text-xs font-medium">Novo Pedido</span>
                        </button>
                        <button
                          onClick={() => { setSelectedTab(tab); setView('tab-orders'); }}
                          className={`flex flex-col items-center justify-center p-3 rounded-lg ${
                            isOccupied 
                              ? 'bg-green-50 text-green-700 active:bg-green-100' 
                              : 'bg-gray-50 text-gray-400'
                          }`}
                          disabled={!isOccupied}
                        >
                          <Receipt className="w-5 h-5 mb-1" />
                          <span className="text-xs font-medium">
                            {isOccupied ? 'Ver/Fechar' : 'Sem pedidos'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <ClipboardList className="w-16 h-16 mb-4 opacity-50" />
                <p>Nenhuma comanda cadastrada</p>
                <p className="text-sm">Cadastre comandas no sistema</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Bottom Buttons */}
      <div className="p-3 bg-white border-t space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            className="h-12 bg-[#2d5a87] hover:bg-[#1e3a5f] text-white gap-2 font-semibold"
            onClick={() => handleStartDelivery('delivery')}
          >
            <Bike className="w-5 h-5" />
            Delivery
          </Button>
          <Button 
            className="h-12 bg-green-600 hover:bg-green-700 text-white gap-2 font-semibold"
            onClick={() => handleStartDelivery('takeaway')}
          >
            <Package className="w-5 h-5" />
            Para Levar
          </Button>
        </div>
      </div>

      {/* Size Selection Modal */}
      {sizeModalProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Escolha o tamanho</h3>
            <p className="text-sm text-gray-600">{sizeModalProduct.name}</p>
            <div className="space-y-2">
              {sizeModalProduct.price_small != null && (
                <Button
                  variant="outline"
                  className="w-full justify-between h-14 text-left"
                  onClick={() => addToCartWithSize(sizeModalProduct, 'small')}
                >
                  <span className="font-medium">Pequeno (P)</span>
                  <span className="font-bold text-primary">{formatCurrency(sizeModalProduct.price_small)}</span>
                </Button>
              )}
              {sizeModalProduct.price_medium != null && (
                <Button
                  variant="outline"
                  className="w-full justify-between h-14 text-left"
                  onClick={() => addToCartWithSize(sizeModalProduct, 'medium')}
                >
                  <span className="font-medium">Médio (M)</span>
                  <span className="font-bold text-primary">{formatCurrency(sizeModalProduct.price_medium)}</span>
                </Button>
              )}
              {sizeModalProduct.price_large != null && (
                <Button
                  variant="outline"
                  className="w-full justify-between h-14 text-left"
                  onClick={() => addToCartWithSize(sizeModalProduct, 'large')}
                >
                  <span className="font-medium">Grande (G)</span>
                  <span className="font-bold text-primary">{formatCurrency(sizeModalProduct.price_large)}</span>
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setSizeModalProduct(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
