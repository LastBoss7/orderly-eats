import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { usePrintSettings } from '@/hooks/usePrintSettings';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart,
  User,
  Loader2,
  Banknote,
  CreditCard,
  Smartphone,
  X,
  CheckCircle2,
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

type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { id: 'cash', label: 'Dinheiro', icon: <Banknote className="w-6 h-6" /> },
  { id: 'credit', label: 'Crédito', icon: <CreditCard className="w-6 h-6" /> },
  { id: 'debit', label: 'Débito', icon: <CreditCard className="w-6 h-6" /> },
  { id: 'pix', label: 'Pix', icon: <Smartphone className="w-6 h-6" /> },
];

export default function POS() {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const { shouldAutoPrint } = usePrintSettings();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);

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

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to clear search
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchTerm('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchLower) ||
      p.id.toLowerCase().includes(searchLower);
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

  const handleOpenPaymentModal = () => {
    if (cart.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Carrinho vazio',
        description: 'Adicione produtos ao pedido.',
      });
      return;
    }
    setShowPaymentModal(true);
    setSelectedPayment(null);
  };

  const handleConfirmPayment = async () => {
    if (!selectedPayment) {
      toast({
        variant: 'destructive',
        title: 'Selecione a forma de pagamento',
        description: 'Escolha como o cliente vai pagar.',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create order with payment method in notes
      const autoPrint = shouldAutoPrint('counter');
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant?.id,
          customer_name: customerName || null,
          order_type: 'counter',
          status: 'pending',
          print_status: autoPrint ? 'pending' : 'disabled',
          total: cartTotal,
          notes: `Pagamento: ${paymentMethods.find(p => p.id === selectedPayment)?.label}`,
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
        title: 'Pedido finalizado!',
        description: `Pedido #${order.id.slice(0, 8)} - ${paymentMethods.find(p => p.id === selectedPayment)?.label}`,
      });

      // Clear cart and close modal
      setCart([]);
      setCustomerName('');
      setShowPaymentModal(false);
      setSelectedPayment(null);
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
          {/* Enhanced Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar por nome ou código... (Ctrl+K)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-20 h-11 text-base"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchTerm('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            <kbd className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
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

          {/* Search Results Count */}
          {searchTerm && (
            <p className="text-sm text-muted-foreground mb-2">
              {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
            </p>
          )}

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
                {searchTerm && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                  >
                    Limpar busca
                  </Button>
                )}
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
                    <span className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      #{product.id.slice(0, 6)}
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
              {cart.length > 0 && (
                <span className="ml-auto text-sm bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
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
              disabled={cart.length === 0}
              onClick={handleOpenPaymentModal}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Finalizar Pedido
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Method Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              Forma de Pagamento
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            {/* Order Summary */}
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Itens</span>
                <span className="text-sm">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(cartTotal)}</span>
              </div>
            </div>

            {/* Payment Options */}
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 ${
                    selectedPayment === method.id
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  {selectedPayment === method.id && (
                    <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary" />
                  )}
                  <div className={`mb-2 ${selectedPayment === method.id ? 'text-primary' : 'text-muted-foreground'}`}>
                    {method.icon}
                  </div>
                  <span className={`text-sm font-medium ${selectedPayment === method.id ? 'text-primary' : ''}`}>
                    {method.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPaymentModal(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedPayment || submitting}
              onClick={handleConfirmPayment}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
