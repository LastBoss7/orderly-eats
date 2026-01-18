import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { Search, LayoutGrid, LayoutList, ShoppingCart } from 'lucide-react';
import { 
  Table, 
  Tab, 
  Category, 
  Product, 
  CartItem,
  ProductSize,
  OrderMode,
} from '../types';
import { WaiterHeader, ProductCard, CartSummary, SizeModal } from '../components';

interface OrderViewProps {
  table?: Table | null;
  tab?: Tab | null;
  orderMode: OrderMode;
  categories: Category[];
  products: Product[];
  cart: CartItem[];
  orderNotes: string;
  isSubmitting: boolean;
  editingItemNotes: string | null;
  menuViewMode: 'list' | 'grid';
  deliveryCustomerName?: string;
  onBack: () => void;
  onAddToCart: (product: Product, size: ProductSize | null) => void;
  onUpdateQuantity: (productId: string, size: ProductSize | null | undefined, delta: number) => void;
  onRemoveItem: (productId: string, size: ProductSize | null | undefined) => void;
  onUpdateItemNotes: (productId: string, size: ProductSize | null | undefined, notes: string) => void;
  onOrderNotesChange: (notes: string) => void;
  onSetEditingItemNotes: (id: string | null) => void;
  onMenuViewModeChange: (mode: 'list' | 'grid') => void;
  onSubmit: () => void;
}

export function OrderView({
  table,
  tab,
  orderMode,
  categories,
  products,
  cart,
  orderNotes,
  isSubmitting,
  editingItemNotes,
  menuViewMode,
  deliveryCustomerName,
  onBack,
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateItemNotes,
  onOrderNotesChange,
  onSetEditingItemNotes,
  onMenuViewModeChange,
  onSubmit,
}: OrderViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sizeModalProduct, setSizeModalProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleProductClick = (product: Product) => {
    if (product.has_sizes) {
      setSizeModalProduct(product);
    } else {
      onAddToCart(product, null);
    }
  };

  const handleSelectSize = (size: ProductSize) => {
    if (sizeModalProduct) {
      onAddToCart(sizeModalProduct, size);
      setSizeModalProduct(null);
    }
  };

  // Title based on order mode
  let title = '';
  let subtitle = '';
  
  if (orderMode === 'table' && table) {
    title = `Mesa ${table.number}`;
    subtitle = 'Novo pedido';
  } else if (orderMode === 'tab' && tab) {
    title = tab.customer_name || `Comanda #${tab.number}`;
    subtitle = `Comanda #${tab.number}`;
  } else if (orderMode === 'delivery') {
    title = 'Delivery';
    subtitle = deliveryCustomerName || 'Novo pedido';
  } else if (orderMode === 'takeaway') {
    title = 'Para Levar';
    subtitle = deliveryCustomerName || 'Novo pedido';
  }

  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen bg-background flex flex-col"
    >
      <WaiterHeader
        title={title}
        subtitle={subtitle}
        showBack
        onBack={onBack}
        rightElement={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => onMenuViewModeChange(menuViewMode === 'list' ? 'grid' : 'list')}
            >
              {menuViewMode === 'list' ? (
                <LayoutGrid className="w-5 h-5" />
              ) : (
                <LayoutList className="w-5 h-5" />
              )}
            </Button>
            {itemCount > 0 && (
              <div className="bg-primary-foreground/20 rounded-full px-2 py-1 text-xs font-bold">
                {itemCount}
              </div>
            )}
          </div>
        }
      />

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
        <div className={`p-3 ${menuViewMode === 'grid' ? 'grid grid-cols-3 gap-2' : 'space-y-2'}`}>
          {filteredProducts.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const totalQty = cart.filter(i => i.product.id === product.id)
                .reduce((s, i) => s + i.quantity, 0);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={totalQty}
                  viewMode={menuViewMode}
                  onClick={() => handleProductClick(product)}
                />
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Cart Summary */}
      <CartSummary
        cart={cart}
        orderNotes={orderNotes}
        isSubmitting={isSubmitting}
        editingItemNotes={editingItemNotes}
        onUpdateQuantity={onUpdateQuantity}
        onRemoveItem={onRemoveItem}
        onUpdateNotes={onUpdateItemNotes}
        onOrderNotesChange={onOrderNotesChange}
        onSetEditingItemNotes={onSetEditingItemNotes}
        onSubmit={onSubmit}
      />

      {/* Size Modal */}
      {sizeModalProduct && (
        <SizeModal
          product={sizeModalProduct}
          onSelectSize={handleSelectSize}
          onClose={() => setSizeModalProduct(null)}
        />
      )}
    </motion.div>
  );
}
