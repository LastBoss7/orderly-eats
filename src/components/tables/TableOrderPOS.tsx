import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePrintSettings } from '@/hooks/usePrintSettings';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart,
  Loader2,
  X,
  Filter,
  Send,
  Package,
  MessageSquare,
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
  is_available: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

interface Table {
  id: string;
  number: number;
  capacity?: number;
  status: 'available' | 'occupied' | 'closing';
}

interface Tab {
  id: string;
  number: number;
  customer_name?: string | null;
  status?: 'available' | 'occupied' | 'closing';
}

interface TableOrderPOSProps {
  table?: Table | null;
  tab?: Tab | null;
  onClose: () => void;
  onOrderCreated: () => void;
}

export function TableOrderPOS({ table, tab, onClose, onOrderCreated }: TableOrderPOSProps) {
  const isTab = !!tab && !table;
  const targetId = isTab ? tab?.id : table?.id;
  const targetNumber = isTab ? tab?.number : table?.number;
  const targetLabel = isTab ? `Comanda #${targetNumber}` : `Mesa ${targetNumber}`;
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const { shouldAutoPrint } = usePrintSettings();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!restaurant?.id) return;

      try {
        const [categoriesRes, productsRes] = await Promise.all([
          supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order'),
          supabase.from('products').select('*').eq('restaurant_id', restaurant.id).eq('is_available', true),
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // P for search
      if (e.key === 'p' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to clear/close
      if (e.key === 'Escape') {
        if (document.activeElement === searchInputRef.current) {
          setSearchTerm('');
          searchInputRef.current?.blur();
        } else if (editingNotes) {
          setEditingNotes(null);
        }
      }
      // Enter to submit
      if (e.key === 'Enter' && e.ctrlKey && cart.length > 0) {
        handleSubmitOrder();
      }
      // A for advance/submit
      if (e.key === 'a' && !e.ctrlKey && !e.metaKey && document.activeElement?.tagName !== 'INPUT' && cart.length > 0) {
        handleSubmitOrder();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, editingNotes]);

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchLower);
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

  const updateItemNotes = (productId: string, notes: string) => {
    setCart(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, notes }
        : item
    ));
  };

  const handleStartEditNotes = (productId: string, currentNotes?: string) => {
    setEditingNotes(productId);
    setTempNotes(currentNotes || '');
  };

  const handleSaveNotes = (productId: string) => {
    updateItemNotes(productId, tempNotes);
    setEditingNotes(null);
    setTempNotes('');
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const cartItemsCount = cart.reduce(
    (sum, item) => sum + item.quantity,
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
      const orderType = isTab ? 'table' : 'table'; // Both use 'table' type
      const shouldPrint = shouldAutoPrint('table');
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant?.id,
          table_id: isTab ? null : targetId,
          tab_id: isTab ? targetId : null,
          order_type: orderType,
          status: 'pending',
          print_status: shouldPrint ? 'pending' : 'disabled',
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
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Note: Table occupation is now handled automatically by database trigger
      // Note: Print is handled automatically by backend service when print_status = 'pending'

      toast({
        title: 'Pedido enviado!',
        description: `Pedido da ${targetLabel} enviado para a cozinha.`,
      });

      // Clear cart and notify parent
      setCart([]);
      onOrderCreated();
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
    <div className="h-full flex flex-col bg-background">
      {/* Header with tabs */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Pedidos</span>
              <span className="text-sm font-medium text-muted-foreground">balcão (PDV)</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              [O] Observação
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              [Q] Editar
            </Button>
            <Button variant="outline" size="sm" className="gap-2 text-destructive border-destructive/50">
              [W] Excluir
            </Button>
          </div>
        </div>
        
        {/* Mode Tabs */}
        <div className="flex gap-2 px-3 pb-3">
          <Button 
            variant="outline" 
            className="gap-2 text-muted-foreground"
            onClick={onClose}
          >
            [ D ] Delivery e Balcão
          </Button>
          <Button className="gap-2 bg-primary text-primary-foreground">
            [ M ] Mesas e Comandas
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Section - Categories & Products */}
        <div className="flex-1 flex overflow-hidden">
          {/* Categories Sidebar */}
          <div className="w-40 border-r bg-muted/30 flex flex-col">
            <div className="p-2 border-b">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start gap-2"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
                [F] Filtros
              </Button>
            </div>
            
            <div className="p-2 border-b">
              <span className="text-xs text-muted-foreground px-2">[ N ] Navegar</span>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                <Button
                  variant={selectedCategory === null ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSelectedCategory(null)}
                >
                  TODOS
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    {category.name.toUpperCase()}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Products Grid */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search Bar */}
            <div className="p-3 border-b flex items-center gap-3">
              <div className="relative flex-1">
                <Input
                  ref={searchInputRef}
                  placeholder="[ P ] Pesquisar"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                {searchTerm ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                ) : (
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Navigation hints */}
            <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
              <span>🔀 Navegação</span>
              <span className="text-primary font-medium">ENTER</span>
              <span>Selecionar item</span>
            </div>

            {/* Category Title */}
            <div className="px-4 py-2 border-b">
              <h3 className="font-semibold">
                {selectedCategory 
                  ? categories.find(c => c.id === selectedCategory)?.name 
                  : 'Todos os Produtos'}
              </h3>
            </div>

            {/* Products */}
            <ScrollArea className="flex-1 p-3">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Package className="w-12 h-12 mb-2 opacity-50" />
                  <p>Nenhum produto encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <AnimatePresence>
                    {filteredProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.02 }}
                        className={`
                          relative bg-card border rounded-xl p-3 cursor-pointer 
                          hover:border-primary hover:shadow-md transition-all
                          ${!product.is_available ? 'opacity-50' : ''}
                        `}
                        onClick={() => product.is_available && addToCart(product)}
                      >
                        {/* Product Image */}
                        <div className="aspect-square rounded-lg bg-muted mb-2 overflow-hidden">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        
                        {/* Sold out badge */}
                        {!product.is_available && (
                          <Badge 
                            variant="destructive" 
                            className="absolute top-2 left-2 text-xs"
                          >
                            ESGOTADO
                          </Badge>
                        )}
                        
                        {/* Product Info */}
                        <p className="text-sm font-medium line-clamp-2 mb-1">
                          {product.name}
                        </p>
                        <p className="text-sm font-bold text-primary">
                          {formatCurrency(product.price)}
                        </p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </ScrollArea>

            {/* Bottom action bar */}
            <div className="p-3 border-t bg-card">
              <Button 
                className="w-full gap-2 h-11"
                onClick={handleSubmitOrder}
                disabled={cart.length === 0 || submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>[ A ] Avançar</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right Section - Cart */}
        <div className="w-80 border-l bg-card flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Itens do pedido</h3>
              <span className="text-sm text-muted-foreground">Subtotal</span>
            </div>
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1 p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center py-8">
                <ShoppingCart className="w-12 h-12 mb-3 opacity-30" />
                <p>Finalize o item ao lado, ele vai aparecer aqui</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {cart.map((item) => (
                    <motion.div
                      key={item.product.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-muted/50 rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.product.price)} cada
                          </p>
                        </div>
                        <p className="font-semibold text-primary">
                          {formatCurrency(item.product.price * item.quantity)}
                        </p>
                      </div>
                      
                      {/* Notes */}
                      {editingNotes === item.product.id ? (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Observação..."
                            value={tempNotes}
                            onChange={(e) => setTempNotes(e.target.value)}
                            className="h-8 text-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveNotes(item.product.id);
                              if (e.key === 'Escape') setEditingNotes(null);
                            }}
                          />
                          <Button 
                            size="sm" 
                            className="h-8"
                            onClick={() => handleSaveNotes(item.product.id)}
                          >
                            OK
                          </Button>
                        </div>
                      ) : item.notes ? (
                        <button
                          className="text-xs text-warning flex items-center gap-1 hover:underline"
                          onClick={() => handleStartEditNotes(item.product.id, item.notes)}
                        >
                          <MessageSquare className="w-3 h-3" />
                          {item.notes}
                        </button>
                      ) : (
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          onClick={() => handleStartEditNotes(item.product.id)}
                        >
                          <MessageSquare className="w-3 h-3" />
                          Adicionar observação
                        </button>
                      )}
                      
                      {/* Quantity controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
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
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </ScrollArea>

          {/* Totals */}
          <div className="border-t p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(cartTotal)}</span>
            </div>
          </div>

          {/* Table Info & Actions */}
          <div className="border-t p-4 space-y-3 bg-muted/30">
            <Button 
              className="w-full h-12 bg-sky-500 hover:bg-sky-600 text-white font-semibold gap-2"
              variant="default"
            >
              [ S ] Mesa e Comanda
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="(XX) X XXXX-XXXX" className="h-10 text-sm" />
              <Input placeholder="Nome do clie..." className="h-10 text-sm" />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="h-10 gap-2">
                [ T ] CPF/CNPJ
              </Button>
              <Button variant="outline" className="h-10 gap-2">
                [ Y ] Ajustar valor
              </Button>
            </div>

            <Button 
              className="w-full h-14 text-lg font-bold gap-2 bg-success hover:bg-success/90"
              onClick={handleSubmitOrder}
              disabled={cart.length === 0 || submitting}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  [ ENTER ] Gerar pedido
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
