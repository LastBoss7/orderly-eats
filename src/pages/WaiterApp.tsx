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
  ShoppingCart,
  Users,
  Loader2,
  Send,
  ChefHat,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MessageSquare,
  Home,
  UtensilsCrossed,
  Bell,
  User,
  LogOut,
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

type AppView = 'login' | 'home' | 'tables' | 'order' | 'active-orders' | 'order-detail';

export default function WaiterApp() {
  const { restaurant, signOut } = useAuth();
  const { shouldAutoPrint } = usePrintSettings();

  // States
  const [view, setView] = useState<AppView>('login');
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [selectedWaiter, setSelectedWaiter] = useState<Waiter | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
    if (view === 'active-orders' || view === 'home') {
      fetchActiveOrders();
    }
  }, [view, fetchActiveOrders]);

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

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectWaiter = (waiter: Waiter) => {
    setSelectedWaiter(waiter);
    setView('home');
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

      // Go back to home
      setView('home');
      setSelectedTable(null);
      setCart([]);
      setOrderNotes('');
    } catch (error: any) {
      toast.error('Erro ao enviar pedido: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      available: 'bg-green-500',
      occupied: 'bg-orange-500',
      closing: 'bg-yellow-500',
      pending: 'bg-yellow-500',
      preparing: 'bg-blue-500',
      ready: 'bg-green-500',
      delivered: 'bg-gray-400',
    };
    return colors[status] || 'bg-gray-400';
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Login / Waiter Selection View
  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col">
        <header className="p-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-3">
            <ChefHat className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold">{restaurant?.name}</h1>
          <p className="text-sm text-muted-foreground">Selecione seu perfil para começar</p>
        </header>

        <div className="flex-1 p-4">
          <div className="max-w-md mx-auto space-y-3">
            {waiters.map((waiter) => (
              <button
                key={waiter.id}
                onClick={() => handleSelectWaiter(waiter)}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl border shadow-sm hover:shadow-md hover:border-primary/50 transition-all active:scale-[0.98]"
              >
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {getInitials(waiter.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-lg">{waiter.name}</p>
                  <p className="text-sm text-muted-foreground">Garçom</p>
                </div>
                <ChefHat className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}

            {waiters.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum garçom cadastrado</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 text-center">
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair do sistema
          </Button>
        </div>
      </div>
    );
  }

  // Home View
  if (view === 'home') {
    const pendingOrders = activeOrders.filter(o => o.status === 'pending').length;
    const preparingOrders = activeOrders.filter(o => o.status === 'preparing').length;
    const readyOrders = activeOrders.filter(o => o.status === 'ready').length;
    const occupiedTables = tables.filter(t => t.status === 'occupied').length;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="bg-primary text-primary-foreground p-4 safe-area-inset-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary-foreground/30">
                <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                  {selectedWaiter ? getInitials(selectedWaiter.name) : 'G'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{selectedWaiter?.name}</p>
                <p className="text-xs opacity-80">{restaurant?.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setView('login')}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Stats */}
        <div className="p-4 grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <UtensilsCrossed className="w-4 h-4" />
              <span className="text-xs">Mesas Ocupadas</span>
            </div>
            <p className="text-2xl font-bold">{occupiedTables}/{tables.length}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ClipboardList className="w-4 h-4" />
              <span className="text-xs">Pedidos Ativos</span>
            </div>
            <p className="text-2xl font-bold">{activeOrders.length}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 pt-0">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Ações Rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setView('tables')}
              className="flex flex-col items-center gap-2 p-6 bg-primary text-primary-foreground rounded-2xl active:scale-[0.98] transition-transform"
            >
              <Plus className="w-8 h-8" />
              <span className="font-semibold">Novo Pedido</span>
            </button>
            <button
              onClick={() => { setView('active-orders'); fetchActiveOrders(); }}
              className="relative flex flex-col items-center gap-2 p-6 bg-card border rounded-2xl active:scale-[0.98] transition-transform"
            >
              <ClipboardList className="w-8 h-8 text-primary" />
              <span className="font-semibold">Pedidos</span>
              {readyOrders > 0 && (
                <span className="absolute top-2 right-2 w-6 h-6 bg-green-500 text-white rounded-full text-xs font-bold flex items-center justify-center animate-pulse">
                  {readyOrders}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active Orders Preview */}
        {activeOrders.length > 0 && (
          <div className="flex-1 p-4 pt-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground">Pedidos Recentes</h2>
              <Button variant="ghost" size="sm" onClick={fetchActiveOrders}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {activeOrders.slice(0, 5).map((order) => (
                <button
                  key={order.id}
                  onClick={() => { setSelectedOrder(order); setView('order-detail'); }}
                  className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border text-left active:scale-[0.99] transition-transform"
                >
                  <div className={`w-2 h-10 rounded-full ${getStatusColor(order.status)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        Mesa {order.tables?.number || '-'}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.order_items?.length || 0} itens • {formatCurrency(order.total || 0)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(order.created_at)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Nav */}
        <nav className="sticky bottom-0 bg-card border-t p-2 safe-area-inset-bottom">
          <div className="flex justify-around">
            <button
              onClick={() => setView('home')}
              className="flex flex-col items-center gap-1 p-2 text-primary"
            >
              <Home className="w-6 h-6" />
              <span className="text-xs font-medium">Início</span>
            </button>
            <button
              onClick={() => setView('tables')}
              className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
            >
              <UtensilsCrossed className="w-6 h-6" />
              <span className="text-xs">Mesas</span>
            </button>
            <button
              onClick={() => { setView('active-orders'); fetchActiveOrders(); }}
              className="relative flex flex-col items-center gap-1 p-2 text-muted-foreground"
            >
              <ClipboardList className="w-6 h-6" />
              <span className="text-xs">Pedidos</span>
              {readyOrders > 0 && (
                <span className="absolute -top-1 right-0 w-5 h-5 bg-green-500 text-white rounded-full text-xs font-bold flex items-center justify-center">
                  {readyOrders}
                </span>
              )}
            </button>
            <button
              onClick={() => setView('login')}
              className="flex flex-col items-center gap-1 p-2 text-muted-foreground"
            >
              <User className="w-6 h-6" />
              <span className="text-xs">Perfil</span>
            </button>
          </div>
        </nav>
      </div>
    );
  }

  // Tables View
  if (view === 'tables') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-10 safe-area-inset-top">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setView('home')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold">Selecione uma Mesa</h1>
              <p className="text-xs opacity-80">{tables.length} mesas disponíveis</p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4">
          <div className="grid grid-cols-3 gap-3">
            {tables.map((table) => (
              <button
                key={table.id}
                className={`p-4 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 ${getStatusColor(table.status)} text-white shadow-lg min-h-[100px]`}
                onClick={() => handleSelectTable(table)}
              >
                <span className="text-3xl font-bold">{table.number}</span>
                <span className="text-xs mt-1 opacity-90">
                  {getStatusLabel(table.status)}
                </span>
                {table.capacity && (
                  <span className="text-xs opacity-70 mt-0.5">
                    {table.capacity} lugares
                  </span>
                )}
              </button>
            ))}
          </div>

          {tables.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Users className="w-16 h-16 mb-4 opacity-50" />
              <p>Nenhuma mesa cadastrada</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Orders View
  if (view === 'active-orders') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-10 safe-area-inset-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setView('home')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold">Pedidos Ativos</h1>
                <p className="text-xs opacity-80">{activeOrders.length} pedidos</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={fetchActiveOrders}
            >
              <RefreshCw className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 p-4 space-y-3">
          {activeOrders.map((order) => (
            <button
              key={order.id}
              onClick={() => { setSelectedOrder(order); setView('order-detail'); }}
              className="w-full bg-card rounded-2xl border p-4 text-left active:scale-[0.99] transition-transform"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">
                      Mesa {order.tables?.number || '-'}
                    </span>
                    <Badge className={`${getStatusColor(order.status)} text-white border-0`}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(order.created_at)}
                  </p>
                </div>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(order.total || 0)}
                </span>
              </div>
              <div className="space-y-1">
                {order.order_items?.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{item.quantity}x</span>
                    <span className="text-muted-foreground">{item.product_name}</span>
                  </div>
                ))}
                {(order.order_items?.length || 0) > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{(order.order_items?.length || 0) - 3} mais itens
                  </p>
                )}
              </div>
            </button>
          ))}

          {activeOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <ClipboardList className="w-16 h-16 mb-4 opacity-50" />
              <p>Nenhum pedido ativo</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Order Detail View
  if (view === 'order-detail' && selectedOrder) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-10 safe-area-inset-top">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => setView('active-orders')}
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
          <div className="bg-card rounded-2xl border p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <Badge className={`${getStatusColor(selectedOrder.status)} text-white border-0 text-sm px-3 py-1`}>
                {getStatusLabel(selectedOrder.status)}
              </Badge>
              <span className="text-xl font-bold text-primary">
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
                      <p className="text-sm text-muted-foreground ml-6">
                        Obs: {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    {formatCurrency(item.product_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {selectedOrder.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
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
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-10 safe-area-inset-top">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
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
      <div className="p-3 bg-card border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-3 py-2 bg-card border-b overflow-x-auto">
        <div className="flex gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            className="h-9 px-4 shrink-0"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              className="h-9 px-4 whitespace-nowrap shrink-0"
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
                className={`relative flex items-center justify-between p-4 bg-card rounded-xl border-2 text-left transition-all active:scale-[0.99] ${
                  quantity > 0 ? 'border-primary bg-primary/5' : 'border-transparent'
                }`}
                onClick={() => addToCart(product)}
              >
                <div className="flex-1 min-w-0 pr-3">
                  <p className="font-medium line-clamp-1">{product.name}</p>
                  <p className="text-primary font-bold">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all ${
                  quantity > 0 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
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
        <div className="sticky bottom-0 bg-card border-t safe-area-inset-bottom">
          <ScrollArea className="max-h-48 p-3">
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.product.id} className="bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
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
                        className="h-9 w-9 text-destructive"
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
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
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
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(cartTotal)}</p>
              </div>
              <Button
                className="h-14 px-8 text-lg gap-2"
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
