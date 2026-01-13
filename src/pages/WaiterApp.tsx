import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { usePrintSettings } from '@/hooks/usePrintSettings';
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
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  LogOut,
  Menu,
  Bike,
  Users,
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
}

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

interface Order {
  id: string;
  table_id: string | null;
  order_type: string;
  status: string;
  total: number;
  created_at: string;
  notes: string | null;
  customer_name: string | null;
  order_items?: OrderItem[];
  tables?: { number: number } | null;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  product_price: number;
  notes: string | null;
}

type AppView = 'login' | 'tables' | 'comandas' | 'order' | 'order-detail';

export default function WaiterApp() {
  const { restaurant, signOut } = useAuth();
  const { shouldAutoPrint } = usePrintSettings();

  // States
  const [view, setView] = useState<AppView>('login');
  const [activeTab, setActiveTab] = useState<'mesas' | 'comandas'>('mesas');
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [selectedWaiter, setSelectedWaiter] = useState<Waiter | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
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

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!restaurant?.id) return;

      try {
        const [waitersRes, tablesRes, categoriesRes, productsRes] = await Promise.all([
          supabase.from('waiters').select('*').eq('status', 'active').order('name'),
          supabase.from('tables').select('*').order('number'),
          supabase.from('categories').select('*').order('sort_order'),
          supabase.from('products').select('*').eq('is_available', true).order('name'),
        ]);

        setWaiters(waitersRes.data || []);
        setTables((tablesRes.data || []) as Table[]);
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
        .eq('order_type', 'table')
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
        {
          event: '*',
          schema: 'public',
          table: 'tables',
        },
        async () => {
          const { data } = await supabase.from('tables').select('*').order('number');
          setTables((data || []) as Table[]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id]);

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
    setView('order');
    setCart([]);
    setSearchTerm('');
    setSelectedCategory(null);
    setOrderNotes('');
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, notes: '' }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQuantity = item.quantity + delta;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const updateItemNotes = (productId: string, notes: string) => {
    setCart(prev => prev.map(item =>
      item.product.id === productId ? { ...item, notes } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

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
    if (!selectedTable || cart.length === 0) return;

    setSubmitting(true);

    try {
      // Update table status
      await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', selectedTable.id);

      const autoPrint = shouldAutoPrint('table');

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant?.id,
          table_id: selectedTable.id,
          order_type: 'table',
          status: 'pending',
          print_status: autoPrint ? 'pending' : 'disabled',
          total: cartTotal,
          notes: orderNotes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        restaurant_id: restaurant?.id,
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success(`Pedido da Mesa ${selectedTable.number} enviado!`);

      // Refresh tables
      const { data } = await supabase.from('tables').select('*').order('number');
      setTables((data || []) as Table[]);

      // Go back to tables
      setView('tables');
      setSelectedTable(null);
      setCart([]);
      setOrderNotes('');
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
              <h1 className="font-bold">Mesa {selectedOrder.tables?.number || '-'}</h1>
              <p className="text-xs opacity-80">{formatTime(selectedOrder.created_at)}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4">
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <Badge className={`${
                selectedOrder.status === 'ready' ? 'bg-green-500' :
                selectedOrder.status === 'preparing' ? 'bg-orange-500' : 'bg-yellow-500'
              } text-white border-0 text-sm px-3 py-1`}>
                {getStatusLabel(selectedOrder.status)}
              </Badge>
              <span className="text-xl font-bold text-[#1e3a5f]">
                {formatCurrency(selectedOrder.total || 0)}
              </span>
            </div>

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

  // Order View (New Order)
  if (view === 'order') {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        <header className="sticky top-0 bg-[#1e3a5f] text-white p-4 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => { setView('tables'); setCart([]); }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold">Mesa {selectedTable?.number}</h1>
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
              const cartItem = cart.find(item => item.product.id === product.id);
              const quantity = cartItem?.quantity || 0;
              
              return (
                <button
                  key={product.id}
                  className={`relative flex items-center justify-between p-4 bg-white rounded-xl border-2 text-left transition-all active:scale-[0.99] ${
                    quantity > 0 ? 'border-[#2d5a87] bg-[#2d5a87]/5' : 'border-transparent shadow-sm'
                  }`}
                  onClick={() => addToCart(product)}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="font-medium line-clamp-1 text-gray-900">{product.name}</p>
                    <p className="text-[#2d5a87] font-bold">
                      {formatCurrency(product.price)}
                    </p>
                  </div>
                  
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all ${
                    quantity > 0 
                      ? 'bg-[#2d5a87] text-white' 
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {quantity > 0 ? (
                      <span className="text-lg font-bold">{quantity}</span>
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
                {cart.map((item) => (
                  <div key={item.product.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-gray-900">{item.product.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(item.product.price)} cada
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={(e) => { e.stopPropagation(); updateQuantity(item.product.id, -1); }}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={(e) => { e.stopPropagation(); updateQuantity(item.product.id, 1); }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-500"
                          onClick={(e) => { e.stopPropagation(); removeFromCart(item.product.id); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {editingItemNotes === item.product.id ? (
                      <Input
                        placeholder="Observações do item..."
                        value={item.notes}
                        onChange={(e) => updateItemNotes(item.product.id, e.target.value)}
                        onBlur={() => setEditingItemNotes(null)}
                        autoFocus
                        className="h-9 text-sm"
                      />
                    ) : (
                      <button
                        onClick={() => setEditingItemNotes(item.product.id)}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" />
                        {item.notes || 'Adicionar observação'}
                      </button>
                    )}
                  </div>
                ))}
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
          <div className="p-3 grid grid-cols-3 gap-2">
            {filteredTables.map((table) => {
              const readyOrder = getTableWithReadyOrder(table.id);
              const bgColor = table.status === 'available' 
                ? 'bg-[#2d5a87]' 
                : table.status === 'occupied' 
                  ? 'bg-[#2d5a87]' 
                  : 'bg-orange-500';
              const hasReadyOrder = readyOrder !== undefined;
              
              return (
                <button
                  key={table.id}
                  onClick={() => handleSelectTable(table)}
                  className={`relative p-4 rounded-lg ${
                    hasReadyOrder ? 'bg-orange-500' : bgColor
                  } text-white min-h-[80px] flex flex-col items-start justify-between transition-all active:scale-95 shadow-sm`}
                >
                  <span className="font-bold text-lg">Mesa {table.number}</span>
                  {hasReadyOrder && (
                    <Badge className="bg-white/20 text-white text-xs mt-1">
                      Pronto
                    </Badge>
                  )}
                  {table.status === 'occupied' && !hasReadyOrder && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-400" />
                  )}
                  {table.status === 'available' && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400" />
                  )}
                  {table.status === 'closing' && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-400" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {activeOrders.length > 0 ? (
              activeOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => { setSelectedOrder(order); setView('order-detail'); }}
                  className="w-full bg-white rounded-xl shadow-sm p-4 text-left active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          Mesa {order.tables?.number || '-'}
                        </span>
                        <Badge className={`${
                          order.status === 'ready' ? 'bg-green-500' :
                          order.status === 'preparing' ? 'bg-orange-500' : 'bg-yellow-500'
                        } text-white border-0`}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {formatTime(order.created_at)}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-[#1e3a5f]">
                      {formatCurrency(order.total || 0)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {order.order_items?.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-700">{item.quantity}x</span>
                        <span className="text-gray-500">{item.product_name}</span>
                      </div>
                    ))}
                    {(order.order_items?.length || 0) > 3 && (
                      <p className="text-xs text-gray-400">
                        +{(order.order_items?.length || 0) - 3} mais itens
                      </p>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <ClipboardList className="w-16 h-16 mb-4 opacity-50" />
                <p>Nenhuma comanda ativa</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Bottom Button */}
      <div className="p-3 bg-white border-t">
        <Button 
          className="w-full h-14 bg-[#2d5a87] hover:bg-[#1e3a5f] text-white gap-2 text-base font-semibold"
          onClick={() => toast.info('Funcionalidade de delivery em breve!')}
        >
          <Bike className="w-5 h-5" />
          Delivery/Para Levar
        </Button>
      </div>
    </div>
  );
}
