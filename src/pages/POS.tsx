import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart,
  User,
  Loader2,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  image_url: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export default function POS() {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!restaurant?.id) return;

      try {
        const [categoriesRes, productsRes] = await Promise.all([
          supabase.from('categories').select('*').order('sort_order'),
          supabase.from('products').select('*').eq('is_available', true),
        ]);

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
    if (cart.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Carrinho vazio',
        description: 'Adicione produtos ao pedido.',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant?.id,
          customer_name: customerName || null,
          order_type: 'counter',
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
        title: 'Pedido criado!',
        description: `Pedido #${order.id.slice(0, 8)} enviado para a cozinha.`,
      });

      // Clear cart
      setCart([]);
      setCustomerName('');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar pedido',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-3.5rem)] flex animate-fade-in">
        {/* Left Panel - Products */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
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

          {/* Products Grid */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="pos-product-card"
                    onClick={() => addToCart(product)}
                  >
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-2">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <ShoppingCart className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-center line-clamp-2">
                      {product.name}
                    </span>
                    <span className="text-sm font-bold text-primary mt-1">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel - Cart */}
        <div className="w-80 lg:w-96 border-l bg-card flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Pedido Atual
            </h2>
          </div>

          {/* Customer */}
          <div className="p-4 border-b">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Nome do cliente (opcional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1 p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <ShoppingCart className="w-12 h-12 mb-2 opacity-50" />
                <p>Carrinho vazio</p>
                <p className="text-xs">Clique nos produtos para adicionar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.product.price)} cada
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Total & Submit */}
          <div className="p-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(cartTotal)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(cartTotal)}
              </span>
            </div>
            <Button
              className="w-full h-12 text-base"
              disabled={cart.length === 0 || submitting}
              onClick={handleSubmitOrder}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Finalizar Pedido
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
