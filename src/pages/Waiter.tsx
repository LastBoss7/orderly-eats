import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
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
} from 'lucide-react';

interface Table {
  id: string;
  number: number;
  status: 'available' | 'occupied' | 'closing';
}

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

type View = 'tables' | 'order';

export default function Waiter() {
  const { restaurant, signOut } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<View>('tables');
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!restaurant?.id) return;

      try {
        const [tablesRes, categoriesRes, productsRes] = await Promise.all([
          supabase.from('tables').select('*').order('number'),
          supabase.from('categories').select('*').order('sort_order'),
          supabase.from('products').select('*').eq('is_available', true),
        ]);

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

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
    setView('order');
    setCart([]);
    setSearchTerm('');
    setSelectedCategory(null);
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
      return [...prev, { product, quantity: 1 }];
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

  const handleSubmitOrder = async () => {
    if (!selectedTable || cart.length === 0) return;

    setSubmitting(true);

    try {
      // Update table status
      await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', selectedTable.id);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant?.id,
          table_id: selectedTable.id,
          order_type: 'table',
          status: 'pending',
          total: cartTotal,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => ({
        restaurant_id: restaurant?.id,
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast({
        title: 'Pedido enviado!',
        description: `Mesa ${selectedTable.number} - Pedido enviado para a cozinha.`,
      });

      // Go back to tables
      setView('tables');
      setSelectedTable(null);
      setCart([]);

      // Refresh tables
      const { data } = await supabase.from('tables').select('*').order('number');
      setTables((data || []) as Table[]);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar pedido',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: Table['status']) => {
    const colors = {
      available: 'bg-success',
      occupied: 'bg-destructive',
      closing: 'bg-warning',
    };
    return colors[status];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Tables View
  if (view === 'tables') {
    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="sticky top-0 bg-primary text-primary-foreground p-4 shadow-lg z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChefHat className="w-6 h-6" />
              <div>
                <h1 className="font-bold">Modo Garçom</h1>
                <p className="text-xs opacity-80">{restaurant?.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={signOut}
            >
              Sair
            </Button>
          </div>
        </header>

        {/* Tables Grid */}
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Selecione uma Mesa</h2>
          <div className="grid grid-cols-3 gap-3">
            {tables.map((table) => (
              <button
                key={table.id}
                className={`p-6 rounded-2xl flex flex-col items-center justify-center transition-transform active:scale-95 ${getStatusColor(table.status)} text-white shadow-lg`}
                onClick={() => handleSelectTable(table)}
              >
                <span className="text-2xl font-bold">{table.number}</span>
                <span className="text-xs mt-1 opacity-90">
                  {table.status === 'available' ? 'Livre' : table.status === 'occupied' ? 'Ocupada' : 'Fechando'}
                </span>
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

  // Order View
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-primary text-primary-foreground p-4 shadow-lg z-10">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={() => {
              setView('tables');
              setCart([]);
            }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold">Mesa {selectedTable?.number}</h1>
            <p className="text-xs opacity-80">Adicionar pedido</p>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="p-4 bg-card border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-2 bg-card border-b overflow-x-auto">
        <div className="flex gap-2">
          <Button
            variant={selectedCategory === null ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Products */}
      <ScrollArea className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              className="p-4 bg-card rounded-xl border text-left transition-all active:scale-95 hover:border-primary"
              onClick={() => addToCart(product)}
            >
              <p className="font-medium text-sm line-clamp-2">{product.name}</p>
              <p className="text-primary font-bold mt-1">
                {formatCurrency(product.price)}
              </p>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="sticky bottom-0 bg-card border-t p-4 space-y-3 shadow-lg">
          <ScrollArea className="max-h-32">
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between bg-muted/50 rounded-lg p-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.product.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.product.id, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-primary">
                {formatCurrency(cartTotal)}
              </p>
            </div>
            <Button
              size="lg"
              className="gap-2"
              disabled={submitting}
              onClick={handleSubmitOrder}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
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
