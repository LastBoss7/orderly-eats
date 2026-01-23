import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Restaurant,
  Category,
  Product,
  CartItem,
  ProductSize,
  CustomerInfo,
  OrderType,
  CouponValidation,
  MenuSettings,
  DaySchedule,
  defaultOpeningHours,
  formatCurrency,
  getProductPrice,
  getSizeLabel,
} from './types';
import {
  MenuHeader,
  MenuCategories,
  MenuProductCard,
  MenuSizeModal,
  MenuCart,
  MenuCheckout,
} from './components';
import { Loader2 } from 'lucide-react';
import { generateWhatsAppOrderLink } from '@/lib/whatsapp';

export default function MenuPage() {
  const { slug } = useParams<{ slug: string }>();

  // Data states
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuSettings, setMenuSettings] = useState<MenuSettings>({
    digital_menu_enabled: true,
    digital_menu_banner_url: null,
    digital_menu_description: null,
    digital_menu_delivery_enabled: true,
    digital_menu_pickup_enabled: true,
    digital_menu_min_order_value: 0,
    opening_hours: defaultOpeningHours,
    use_opening_hours: false,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI states
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Cart states
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sizeModalOpen, setSizeModalOpen] = useState(false);

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discount_type: string;
    discount_value: number;
  } | null>(null);

  // Load restaurant data
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) {
        setError('Restaurante não encontrado');
        setLoading(false);
        return;
      }

      try {
        // Fetch restaurant
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('id, name, slug, logo_url, phone, address')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (restaurantError || !restaurantData) {
          setError('Restaurante não encontrado ou inativo');
          setLoading(false);
          return;
        }

        setRestaurant(restaurantData);

        // Fetch menu settings
        const { data: settingsData } = await supabase
          .from('salon_settings')
          .select('digital_menu_enabled, digital_menu_banner_url, digital_menu_description, digital_menu_delivery_enabled, digital_menu_pickup_enabled, digital_menu_min_order_value, opening_hours, use_opening_hours')
          .eq('restaurant_id', restaurantData.id)
          .maybeSingle();

        if (settingsData) {
          setMenuSettings({
            digital_menu_enabled: settingsData.digital_menu_enabled ?? true,
            digital_menu_banner_url: settingsData.digital_menu_banner_url,
            digital_menu_description: settingsData.digital_menu_description,
            digital_menu_delivery_enabled: settingsData.digital_menu_delivery_enabled ?? true,
            digital_menu_pickup_enabled: settingsData.digital_menu_pickup_enabled ?? true,
            digital_menu_min_order_value: settingsData.digital_menu_min_order_value ?? 0,
            opening_hours: (settingsData.opening_hours as unknown as DaySchedule[]) ?? defaultOpeningHours,
            use_opening_hours: settingsData.use_opening_hours ?? false,
          });
        }

        // Fetch categories (only visible in digital menu)
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('id, name, icon, sort_order, visible_digital_menu')
          .eq('restaurant_id', restaurantData.id)
          .eq('visible_digital_menu', true)
          .order('sort_order', { ascending: true });

        setCategories(categoriesData || []);

        // Fetch products
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, description, price, image_url, category_id, is_available, is_featured, has_sizes, price_small, price_medium, price_large')
          .eq('restaurant_id', restaurantData.id)
          .eq('is_available', true);

        setProducts(productsData || []);
      } catch (err) {
        console.error('Error loading menu:', err);
        setError('Erro ao carregar cardápio');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = products;

    // Category filter
    if (selectedCategory === 'featured') {
      result = result.filter((p) => p.is_featured);
    } else if (selectedCategory) {
      result = result.filter((p) => p.category_id === selectedCategory);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [products, selectedCategory, searchQuery]);

  // Featured products check
  const hasFeatured = useMemo(() => products.some((p) => p.is_featured), [products]);

  // Cart count
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  // Cart total
  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cart]
  );

  // Handle add to cart
  const handleAddToCart = useCallback((product: Product) => {
    if (product.has_sizes) {
      setSelectedProduct(product);
      setSizeModalOpen(true);
    } else {
      setCart((prev) => {
        const existing = prev.findIndex(
          (item) => item.product.id === product.id && !item.size && !item.notes
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing].quantity += 1;
          return updated;
        }
        return [
          ...prev,
          {
            product,
            quantity: 1,
            notes: '',
            size: null,
            unitPrice: product.price,
          },
        ];
      });
      toast.success(`${product.name} adicionado ao carrinho`);
    }
  }, []);

  // Handle confirm size modal
  const handleConfirmSize = useCallback(
    (size: ProductSize | null, quantity: number, notes: string) => {
      if (!selectedProduct) return;

      const unitPrice = getProductPrice(selectedProduct, size);

      setCart((prev) => [
        ...prev,
        {
          product: selectedProduct,
          quantity,
          notes,
          size,
          unitPrice,
        },
      ]);

      toast.success(`${selectedProduct.name} adicionado ao carrinho`);
      setSelectedProduct(null);
    },
    [selectedProduct]
  );

  // Update cart quantity
  const handleUpdateQuantity = useCallback((index: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index].quantity += delta;
      if (updated[index].quantity <= 0) {
        updated.splice(index, 1);
      }
      return updated;
    });
  }, []);

  // Remove from cart
  const handleRemoveItem = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
    toast.success('Item removido');
  }, []);

  // Apply coupon
  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode || !restaurant) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_restaurant_id: restaurant.id,
        p_code: couponCode,
        p_order_total: cartTotal,
      });

      if (error) throw error;

      const result = data as unknown as CouponValidation;

      if (!result.valid) {
        setCouponError(result.error || 'Cupom inválido');
        return;
      }

      setAppliedCoupon({
        id: result.coupon_id!,
        code: couponCode,
        discount_type: result.discount_type!,
        discount_value: result.discount_value!,
      });
      setCouponDiscount(result.discount || 0);
      setCouponCode('');
      toast.success('Cupom aplicado com sucesso!');
    } catch (err) {
      console.error('Error validating coupon:', err);
      setCouponError('Erro ao validar cupom');
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, restaurant, cartTotal]);

  // Remove coupon
  const handleRemoveCoupon = useCallback(() => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponError(null);
  }, []);

  // Submit order
  const handleSubmitOrder = useCallback(
    async (orderType: OrderType, customerInfo: CustomerInfo, customerId: string | null, deliveryFee: number) => {
      if (!restaurant || cart.length === 0) return;

      setSubmitting(true);

      try {
        // Build delivery address
        const deliveryAddress =
          orderType === 'delivery'
            ? [
                customerInfo.address,
                customerInfo.number,
                customerInfo.complement,
                customerInfo.neighborhood,
                customerInfo.city,
                customerInfo.cep,
              ]
                .filter(Boolean)
                .join(', ')
            : null;

        // Calculate final total
        const subtotal = cartTotal;
        const discount = couponDiscount;
        const total = Math.max(0, subtotal + deliveryFee - discount);

        // Get order number
        const { data: orderNumber } = await supabase.rpc('get_next_order_number', {
          _restaurant_id: restaurant.id,
        });

        // Create order with customer_id
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            restaurant_id: restaurant.id,
            order_type: 'digital_menu',
            status: 'pending',
            total,
            customer_id: customerId,
            customer_name: customerInfo.name,
            delivery_phone: customerInfo.phone,
            delivery_address: deliveryAddress,
            delivery_fee: deliveryFee,
            order_number: orderNumber,
            coupon_id: appliedCoupon?.id || null,
            coupon_discount: discount,
            notes: `Pedido via Cardápio Digital - ${orderType === 'delivery' ? 'Delivery' : 'Retirada'}`,
          })
          .select()
          .single();

        if (orderError || !order) {
          throw new Error('Erro ao criar pedido');
        }

        // Create order items
        const orderItems = cart.map((item) => ({
          order_id: order.id,
          restaurant_id: restaurant.id,
          product_id: item.product.id,
          product_name: item.product.name + (item.size ? ` (${getSizeLabel(item.size)})` : ''),
          product_price: item.unitPrice,
          product_size: item.size,
          quantity: item.quantity,
          notes: item.notes || null,
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

        if (itemsError) {
          console.error('Error creating order items:', itemsError);
        }

        // Use coupon if applied
        if (appliedCoupon) {
          await supabase.rpc('use_coupon', { p_coupon_id: appliedCoupon.id });
        }

        // Generate WhatsApp message and open
        const whatsappLink = generateWhatsAppOrderLink(restaurant.phone || customerInfo.phone, {
          orderId: order.id,
          orderNumber: order.order_number,
          customerName: customerInfo.name,
          orderType: orderType,
          items: cart.map((item) => ({
            product_name: item.product.name + (item.size ? ` (${getSizeLabel(item.size)})` : ''),
            quantity: item.quantity,
            product_price: item.unitPrice,
            notes: item.notes || null,
          })),
          total,
          deliveryFee,
          deliveryAddress,
          status: 'pending',
          restaurantName: restaurant.name,
        });

        // Clear cart and close modals
        setCart([]);
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCheckoutOpen(false);
        setCartOpen(false);

        toast.success('Pedido enviado com sucesso!');

        // Open WhatsApp
        window.open(whatsappLink, '_blank');
      } catch (err) {
        console.error('Error submitting order:', err);
        toast.error('Erro ao enviar pedido. Tente novamente.');
      } finally {
        setSubmitting(false);
      }
    },
    [restaurant, cart, cartTotal, couponDiscount, appliedCoupon]
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2">Ops!</h1>
          <p className="text-muted-foreground">{error || 'Restaurante não encontrado'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <MenuHeader
        restaurant={restaurant}
        menuSettings={menuSettings}
        cartCount={cartCount}
        onCartClick={() => setCartOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Categories */}
      <MenuCategories
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        hasFeatured={hasFeatured}
      />

      {/* Products Grid */}
      <main className="container mx-auto px-4 py-6">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="text-lg font-medium text-muted-foreground">
              {searchQuery ? 'Nenhum produto encontrado' : 'Nenhum produto nesta categoria'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredProducts.map((product) => (
              <MenuProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </main>

      {/* Size Modal */}
      <MenuSizeModal
        product={selectedProduct}
        open={sizeModalOpen}
        onClose={() => {
          setSizeModalOpen(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleConfirmSize}
      />

      {/* Cart Sheet */}
      <MenuCart
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
        couponCode={couponCode}
        onCouponChange={setCouponCode}
        onApplyCoupon={handleApplyCoupon}
        couponDiscount={couponDiscount}
        couponError={couponError}
        couponLoading={couponLoading}
        appliedCoupon={appliedCoupon}
        onRemoveCoupon={handleRemoveCoupon}
      />

      {/* Checkout Modal */}
      <MenuCheckout
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        total={cartTotal - couponDiscount}
        onSubmit={handleSubmitOrder}
        loading={submitting}
        menuSettings={menuSettings}
        restaurantId={restaurant.id}
      />

      {/* Floating Cart Button (mobile) */}
      {cartCount > 0 && !cartOpen && !checkoutOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-primary text-primary-foreground px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all sm:hidden"
        >
          <span className="font-bold">{cartCount} {cartCount === 1 ? 'item' : 'itens'}</span>
          <span className="font-bold">{formatCurrency(cartTotal - couponDiscount)}</span>
        </button>
      )}
    </div>
  );
}
