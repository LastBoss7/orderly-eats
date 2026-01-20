import { useState, useEffect, memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft,
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Loader2,
  Send,
  MessageSquare,
  Package,
  FileText,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import { 
  Table, 
  Tab, 
  Category, 
  Product, 
  CartItem, 
  DeliveryForm,
  ProductSize,
  formatCurrency,
  getSizeLabel,
} from '../types';

interface OrderViewRefactoredProps {
  orderMode: 'table' | 'delivery' | 'takeaway' | 'tab';
  table: Table | null;
  tab: Tab | null;
  deliveryForm: DeliveryForm;
  categories: Category[];
  products: Product[];
  loadingProducts?: boolean;
  cart: CartItem[];
  orderNotes: string;
  submitting: boolean;
  onBack: () => void;
  onProductClick: (product: Product) => void;
  onUpdateQuantity: (productId: string, size: ProductSize | null | undefined, delta: number) => void;
  onUpdateItemNotes: (productId: string, size: ProductSize | null | undefined, notes: string) => void;
  onRemoveFromCart: (productId: string, size: ProductSize | null | undefined) => void;
  onOrderNotesChange: (notes: string) => void;
  onSubmitOrder: () => void;
  onCategoryChange?: (categoryId: string | null) => void;
}

// Memoized product button
const ProductButton = memo(function ProductButton({
  product,
  totalQty,
  minPrice,
  viewMode,
  onClick,
}: {
  product: Product;
  totalQty: number;
  minPrice: number;
  viewMode: 'list' | 'grid';
  onClick: () => void;
}) {
  if (viewMode === 'grid') {
    return (
      <button
        className={`flex flex-col p-2 bg-card rounded-xl border text-left transition-colors relative ${
          totalQty > 0 ? 'border-primary bg-primary/5' : 'border-transparent shadow-sm'
        }`}
        onClick={onClick}
      >
        {totalQty > 0 && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold z-10">
            {totalQty}
          </div>
        )}
        
        <div className="w-full aspect-square rounded-lg bg-muted overflow-hidden mb-2">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Package className="w-8 h-8" />
            </div>
          )}
        </div>
        
        <p className="font-medium text-sm truncate">{product.name}</p>
        {product.has_sizes && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded inline-block mt-0.5">P/M/G</span>
        )}
        <p className="text-primary font-semibold text-sm mt-1">
          {product.has_sizes ? `A partir de ${formatCurrency(minPrice)}` : formatCurrency(product.price)}
        </p>
      </button>
    );
  }
  
  return (
    <button
      className={`flex items-center gap-3 p-3 bg-card rounded-xl border text-left transition-colors ${
        totalQty > 0 ? 'border-primary bg-primary/5' : 'border-transparent shadow-sm'
      }`}
      onClick={onClick}
    >
      <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
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
          {product.has_sizes ? `A partir de ${formatCurrency(minPrice)}` : formatCurrency(product.price)}
        </p>
      </div>
      
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        totalQty > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {totalQty > 0 ? <span className="font-bold">{totalQty}</span> : <Plus className="w-4 h-4" />}
      </div>
    </button>
  );
});

// Memoized cart item
const CartItemRow = memo(function CartItemRow({
  item,
  itemKey,
  isEditing,
  onUpdateQuantity,
  onUpdateItemNotes,
  onRemoveFromCart,
  onToggleEdit,
}: {
  item: CartItem;
  itemKey: string;
  isEditing: boolean;
  onUpdateQuantity: (delta: number) => void;
  onUpdateItemNotes: (notes: string) => void;
  onRemoveFromCart: () => void;
  onToggleEdit: () => void;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-2">
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
            onClick={() => onUpdateQuantity(-1)}
          >
            <Minus className="w-3 h-3" />
          </Button>
          <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={() => onUpdateQuantity(1)}
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${item.notes ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={onToggleEdit}
          >
            <MessageSquare className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={onRemoveFromCart}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {isEditing && (
        <div className="mt-2">
          <Input
            placeholder="Obs: sem cebola, bem passado..."
            value={item.notes}
            onChange={(e) => onUpdateItemNotes(e.target.value)}
            className="h-8 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onToggleEdit();
            }}
          />
        </div>
      )}
      
      {item.notes && !isEditing && (
        <p className="mt-1 text-xs text-muted-foreground bg-muted rounded px-2 py-0.5 truncate">
          💬 {item.notes}
        </p>
      )}
    </div>
  );
});

export const OrderViewRefactored = memo(function OrderViewRefactored({
  orderMode,
  table,
  tab,
  deliveryForm,
  categories,
  products,
  loadingProducts = false,
  cart,
  orderNotes,
  submitting,
  onBack,
  onProductClick,
  onUpdateQuantity,
  onUpdateItemNotes,
  onRemoveFromCart,
  onOrderNotesChange,
  onSubmitOrder,
  onCategoryChange,
}: OrderViewRefactoredProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [menuViewMode, setMenuViewMode] = useState<'list' | 'grid'>(() => {
    const saved = localStorage.getItem('waiter_menu_view_mode');
    return (saved === 'grid' || saved === 'list') ? saved : 'list';
  });
  const [editingItemNotes, setEditingItemNotes] = useState<string | null>(null);

  // Load first category products on mount
  useEffect(() => {
    if (onCategoryChange && categories.length > 0 && products.length === 0) {
      onCategoryChange(categories[0].id);
      setSelectedCategory(categories[0].id);
    }
  }, [categories, onCategoryChange, products.length]);

  const handleCategorySelect = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    if (onCategoryChange) {
      onCategoryChange(categoryId);
    }
  }, [onCategoryChange]);

  const handleViewModeChange = useCallback((mode: 'list' | 'grid') => {
    setMenuViewMode(mode);
    localStorage.setItem('waiter_menu_view_mode', mode);
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee = orderMode === 'delivery' ? deliveryForm.deliveryFee : 0;
  const orderTotal = cartTotal + deliveryFee;

  const getTitle = () => {
    if (orderMode === 'table' && table) return `Mesa ${table.number}`;
    if (orderMode === 'tab' && tab) return `Comanda #${tab.number}`;
    if (orderMode === 'delivery') return `Delivery - ${deliveryForm.customerName}`;
    if (orderMode === 'takeaway') return `Retirada - ${deliveryForm.customerName}`;
    return 'Novo Pedido';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold">{getTitle()}</h1>
            <p className="text-xs text-primary-foreground/70">
              {cart.length > 0 ? `${cart.length} itens` : 'Adicionar itens'}
            </p>
          </div>
        </div>
      </header>

      {/* Search & View Toggle */}
      <div className="p-3 bg-card border-b">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={menuViewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              className="h-10 w-10 rounded-none"
              onClick={() => handleViewModeChange('list')}
            >
              <LayoutList className="w-4 h-4" />
            </Button>
            <Button
              variant={menuViewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              className="h-10 w-10 rounded-none"
              onClick={() => handleViewModeChange('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-3 py-2 bg-muted/30 border-b overflow-x-auto">
        <div className="flex gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? 'default' : 'outline'}
              size="sm"
              className="shrink-0"
              onClick={() => handleCategorySelect(category.id)}
            >
              {category.icon && <span className="mr-1">{category.icon}</span>}
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Products */}
      <ScrollArea className="flex-1">
        {loadingProducts ? (
          <div className={`p-3 ${menuViewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'grid gap-2'}`}>
            {Array.from({ length: 6 }).map((_, i) => (
              menuViewMode === 'grid' ? (
                <div key={i} className="flex flex-col p-2 bg-card rounded-xl border border-transparent shadow-sm">
                  <Skeleton className="w-full aspect-square rounded-lg mb-2" />
                  <Skeleton className="h-4 w-3/4 mb-1" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <div key={i} className="flex items-center gap-3 p-3 bg-card rounded-xl border border-transparent shadow-sm">
                  <Skeleton className="w-14 h-14 rounded-lg shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                  <Skeleton className="w-10 h-10 rounded-lg" />
                </div>
              )
            ))}
          </div>
        ) : (
        <div className={`p-3 ${menuViewMode === 'grid' ? 'grid grid-cols-2 gap-2' : 'grid gap-2'}`}>
          {filteredProducts.map((product) => {
            const totalQty = cart.filter(i => i.product.id === product.id).reduce((s, i) => s + i.quantity, 0);
            const minPrice = product.has_sizes
              ? Math.min(...[product.price_small, product.price_medium, product.price_large].filter((p): p is number => p != null && p > 0))
              : product.price;
            
            return (
              <ProductButton
                key={product.id}
                product={product}
                totalQty={totalQty}
                minPrice={minPrice}
                viewMode={menuViewMode}
                onClick={() => onProductClick(product)}
              />
            );
          })}
        </div>
        )}
      </ScrollArea>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className="sticky bottom-0 bg-card border-t shadow-lg">
          <ScrollArea className="max-h-48 p-3">
            <div className="space-y-2">
              {cart.map((item, index) => {
                const itemKey = `${item.product.id}-${item.size}-${index}`;
                const isEditingThis = editingItemNotes === itemKey;
                
                return (
                  <CartItemRow
                    key={itemKey}
                    item={item}
                    itemKey={itemKey}
                    isEditing={isEditingThis}
                    onUpdateQuantity={(delta) => onUpdateQuantity(item.product.id, item.size, delta)}
                    onUpdateItemNotes={(notes) => onUpdateItemNotes(item.product.id, item.size, notes)}
                    onRemoveFromCart={() => onRemoveFromCart(item.product.id, item.size)}
                    onToggleEdit={() => setEditingItemNotes(isEditingThis ? null : itemKey)}
                  />
                );
              })}
            </div>
          </ScrollArea>
          
          {/* Order Notes */}
          <div className="px-3 py-2 border-t">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Observação do pedido</span>
            </div>
            <Textarea
              placeholder="Obs geral: mesa do fundo, entregar primeiro a bebida..."
              value={orderNotes}
              onChange={(e) => onOrderNotesChange(e.target.value)}
              className="h-16 text-xs resize-none"
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="p-3 pt-0 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{formatCurrency(orderTotal)}</p>
            </div>
            <Button
              className="h-12 px-6"
              disabled={submitting || cart.length === 0}
              onClick={onSubmitOrder}
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
    </div>
  );
});
