import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  Loader2,
  UtensilsCrossed,
  MapPin,
  Store,
  Phone,
  CheckCircle,
  Banknote,
  CreditCard,
  Smartphone,
  PackageCheck,
  ClipboardList,
} from 'lucide-react';

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

interface Table {
  id: string;
  number: number;
}

interface Tab {
  id: string;
  number: number;
  customer_name: string | null;
  status: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  cep: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

interface DeliveryFee {
  id: string;
  neighborhood: string;
  fee: number;
}

type OrderType = 'counter' | 'table' | 'delivery' | 'takeaway';
type DineInType = 'table' | 'tab';
type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix' | 'voucher';

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
  { id: 'pix', label: 'Pix', icon: <Smartphone className="w-5 h-5" /> },
  { id: 'cash', label: 'Dinheiro', icon: <Banknote className="w-5 h-5" /> },
  { id: 'credit', label: 'Crédito', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'debit', label: 'Débito', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'voucher', label: 'Vale Refeição', icon: <CreditCard className="w-5 h-5" /> },
];

interface NewOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated: () => void;
  shouldAutoPrint?: (orderType: string) => boolean;
  initialOrderType?: OrderType;
}

export function NewOrderModal({ open, onOpenChange, onOrderCreated, shouldAutoPrint, initialOrderType }: NewOrderModalProps) {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const [orderType, setOrderType] = useState<OrderType>(initialOrderType || 'counter');
  const [dineInType, setDineInType] = useState<DineInType>('table');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Customer data
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerFound, setCustomerFound] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Address data
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  useEffect(() => {
    if (open) {
      fetchData();
      // Set initial order type when modal opens
      if (initialOrderType) {
        setOrderType(initialOrderType);
      }
    }
  }, [open, restaurant?.id, initialOrderType]);

  const fetchData = async () => {
    if (!restaurant?.id) return;
    setLoading(true);

    try {
      const [categoriesRes, productsRes, tablesRes, tabsRes, feesRes] = await Promise.all([
        supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('sort_order'),
        supabase.from('products').select('*').eq('restaurant_id', restaurant.id).eq('is_available', true),
        supabase.from('tables').select('*').eq('restaurant_id', restaurant.id).order('number'),
        supabase.from('tabs').select('*').eq('restaurant_id', restaurant.id).in('status', ['available', 'occupied']).order('number'),
        supabase.from('delivery_fees').select('*').eq('restaurant_id', restaurant.id).eq('is_active', true),
      ]);

      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
      setTables(tablesRes.data || []);
      setTabs(tabsRes.data || []);
      setDeliveryFees(feesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerId(null);
    setCustomerFound(false);
    setCustomerSuggestions([]);
    setShowSuggestions(false);
    setCep('');
    setAddress('');
    setAddressNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setState('');
    setDeliveryFee(0);
    setSelectedTable('');
    setSelectedTab('');
    setNotes('');
    setSearchTerm('');
    setOrderType('counter');
    setDineInType('table');
    setSelectedCategory(null);
    setPaymentMethod(null);
  };

  // Format phone number
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // Format CEP
  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  // Search customer by phone
  const searchCustomerByPhone = useCallback(async (phone: string) => {
    if (!restaurant?.id || phone.replace(/\D/g, '').length < 10) {
      setCustomerFound(false);
      setCustomerId(null);
      return;
    }

    setSearchingCustomer(true);
    try {
      const phoneDigits = phone.replace(/\D/g, '');
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('phone', phoneDigits)
        .maybeSingle();

      if (customer) {
        setCustomerId(customer.id);
        setCustomerName(customer.name);
        setCustomerFound(true);
        
        // Fill address if available
        if (customer.cep) setCep(formatCep(customer.cep));
        if (customer.address) setAddress(customer.address);
        if (customer.number) setAddressNumber(customer.number);
        if (customer.complement) setComplement(customer.complement);
        if (customer.neighborhood) setNeighborhood(customer.neighborhood);
        if (customer.city) setCity(customer.city);
        if (customer.state) setState(customer.state);

        // Check delivery fee for neighborhood
        if (customer.neighborhood) {
          const fee = deliveryFees.find(f => 
            f.neighborhood.toLowerCase() === customer.neighborhood?.toLowerCase()
          );
          if (fee) setDeliveryFee(fee.fee);
        }

        toast({
          title: 'Cliente encontrado!',
          description: `${customer.name} - dados carregados.`,
        });
      } else {
        setCustomerFound(false);
        setCustomerId(null);
      }
    } catch (error) {
      console.error('Error searching customer:', error);
    } finally {
      setSearchingCustomer(false);
    }
  }, [restaurant?.id, deliveryFees, toast]);

  // Search customers for autocomplete (partial match on phone or name)
  const searchCustomersForAutocomplete = useCallback(async (searchValue: string) => {
    if (!restaurant?.id) return;
    
    const phoneDigits = searchValue.replace(/\D/g, '');
    
    // Only search if we have at least 3 characters
    if (phoneDigits.length < 3 && searchValue.replace(/\D/g, '').length === searchValue.length) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    if (searchValue.length < 2) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setSearchingCustomer(true);
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .limit(5);

      // Search by phone digits or name
      if (phoneDigits.length >= 3) {
        query = query.ilike('phone', `%${phoneDigits}%`);
      } else {
        query = query.ilike('name', `%${searchValue}%`);
      }

      const { data: customers } = await query;

      if (customers && customers.length > 0) {
        setCustomerSuggestions(customers);
        setShowSuggestions(true);
      } else {
        setCustomerSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setSearchingCustomer(false);
    }
  }, [restaurant?.id]);

  // Select customer from suggestions
  const selectCustomer = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerPhone(formatPhone(customer.phone));
    setCustomerFound(true);
    setShowSuggestions(false);
    setCustomerSuggestions([]);

    // Fill address if available
    if (customer.cep) setCep(formatCep(customer.cep));
    if (customer.address) setAddress(customer.address);
    if (customer.number) setAddressNumber(customer.number);
    if (customer.complement) setComplement(customer.complement);
    if (customer.neighborhood) setNeighborhood(customer.neighborhood);
    if (customer.city) setCity(customer.city);
    if (customer.state) setState(customer.state);

    // Check delivery fee for neighborhood
    if (customer.neighborhood) {
      const fee = deliveryFees.find(f => 
        f.neighborhood.toLowerCase() === customer.neighborhood?.toLowerCase()
      );
      if (fee) setDeliveryFee(fee.fee);
    }

    toast({
      title: 'Cliente selecionado!',
      description: `${customer.name} - dados carregados.`,
    });
  };

  // Handle phone change with debounce
  useEffect(() => {
    const phoneDigits = customerPhone.replace(/\D/g, '');
    
    // Reset customer found state when phone changes
    if (phoneDigits.length < 10) {
      setCustomerFound(false);
      setCustomerId(null);
    }
    
    const timer = setTimeout(() => {
      if (phoneDigits.length >= 10) {
        searchCustomerByPhone(customerPhone);
      } else if (phoneDigits.length >= 3) {
        searchCustomersForAutocomplete(customerPhone);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerPhone, searchCustomerByPhone, searchCustomersForAutocomplete]);

  // Fetch address from CEP
  const fetchAddressFromCep = async (cepValue: string) => {
    const cepDigits = cepValue.replace(/\D/g, '');
    if (cepDigits.length !== 8) return;

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setAddress(data.logradouro || '');
        setNeighborhood(data.bairro || '');
        setCity(data.localidade || '');
        setState(data.uf || '');

        // Check delivery fee for neighborhood
        if (data.bairro) {
          const fee = deliveryFees.find(f => 
            f.neighborhood.toLowerCase() === data.bairro.toLowerCase()
          );
          if (fee) {
            setDeliveryFee(fee.fee);
          } else {
            setDeliveryFee(0);
          }
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'CEP não encontrado',
          description: 'Verifique o CEP informado.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao buscar CEP',
        description: 'Não foi possível buscar o endereço.',
      });
    } finally {
      setLoadingCep(false);
    }
  };

  // Handle CEP change
  const handleCepChange = (value: string) => {
    const formatted = formatCep(value);
    setCep(formatted);
    
    if (value.replace(/\D/g, '').length === 8) {
      fetchAddressFromCep(value);
    }
  };

  // Handle neighborhood change to update delivery fee
  const handleNeighborhoodChange = (value: string) => {
    setNeighborhood(value);
    const fee = deliveryFees.find(f => 
      f.neighborhood.toLowerCase() === value.toLowerCase()
    );
    setDeliveryFee(fee?.fee || 0);
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = !selectedCategory || p.category_id === selectedCategory;
    const matchesSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
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

  const orderTotal = cartTotal + (orderType === 'delivery' ? deliveryFee : 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getFullAddress = () => {
    const parts = [address];
    if (addressNumber) parts.push(addressNumber);
    if (complement) parts.push(complement);
    if (neighborhood) parts.push(neighborhood);
    if (city && state) parts.push(`${city}/${state}`);
    return parts.join(', ');
  };

  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Carrinho vazio',
        description: 'Adicione produtos ao pedido.',
      });
      return;
    }

    // Validate payment method
    if (!paymentMethod) {
      toast({
        variant: 'destructive',
        title: 'Forma de pagamento obrigatória',
        description: 'Selecione uma forma de pagamento para o pedido.',
      });
      return;
    }

    // Validate dine-in selection
    if (orderType === 'table') {
      if (dineInType === 'table' && !selectedTable) {
        toast({
          variant: 'destructive',
          title: 'Mesa não selecionada',
          description: 'Selecione uma mesa para o pedido.',
        });
        return;
      }
      if (dineInType === 'tab' && !selectedTab) {
        toast({
          variant: 'destructive',
          title: 'Comanda não selecionada',
          description: 'Selecione uma comanda para o pedido.',
        });
        return;
      }
    }

    if (orderType === 'delivery') {
      if (!customerName.trim()) {
        toast({
          variant: 'destructive',
          title: 'Nome obrigatório',
          description: 'Informe o nome do cliente para delivery.',
        });
        return;
      }
      if (!address.trim()) {
        toast({
          variant: 'destructive',
          title: 'Endereço obrigatório',
          description: 'Informe o endereço de entrega.',
        });
        return;
      }
    }

    setSubmitting(true);

    try {
      // Save or update customer
      let savedCustomerId = customerId;
      if (orderType === 'delivery' && customerName) {
        const phoneDigits = customerPhone.replace(/\D/g, '');
        const cepDigits = cep.replace(/\D/g, '');

        const customerData = {
          restaurant_id: restaurant?.id,
          name: customerName.trim(),
          phone: phoneDigits,
          cep: cepDigits || null,
          address: address || null,
          number: addressNumber || null,
          complement: complement || null,
          neighborhood: neighborhood || null,
          city: city || null,
          state: state || null,
        };

        if (customerId) {
          // Update existing customer
          await supabase
            .from('customers')
            .update(customerData)
            .eq('id', customerId);
        } else if (phoneDigits.length >= 10) {
          // Create new customer
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert(customerData)
            .select()
            .single();
          
          if (newCustomer) {
            savedCustomerId = newCustomer.id;
          }
        }
      }

      // Get and increment daily order counter
      const { data: settings, error: settingsError } = await supabase
        .from('salon_settings')
        .select('daily_order_counter, is_open')
        .eq('restaurant_id', restaurant?.id)
        .maybeSingle();

      if (settingsError) throw settingsError;

      // Check if store is open
      if (!settings?.is_open) {
        toast({
          variant: 'destructive',
          title: 'Loja fechada',
          description: 'Abra a loja antes de criar novos pedidos.',
        });
        setSubmitting(false);
        return;
      }

      const newOrderNumber = (settings?.daily_order_counter ?? 0) + 1;

      // Update the counter
      await supabase
        .from('salon_settings')
        .update({ daily_order_counter: newOrderNumber })
        .eq('restaurant_id', restaurant?.id);

      // Determine print status based on settings
      const autoPrint = shouldAutoPrint ? shouldAutoPrint(orderType) : true;
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant?.id,
          customer_id: savedCustomerId,
          customer_name: customerName || null,
          delivery_phone: customerPhone.replace(/\D/g, '') || null,
          delivery_address: orderType === 'delivery' ? getFullAddress() : null,
          delivery_fee: orderType === 'delivery' ? deliveryFee : 0,
          table_id: orderType === 'table' && dineInType === 'table' ? selectedTable : null,
          tab_id: orderType === 'table' && dineInType === 'tab' ? selectedTab : null,
          order_type: orderType === 'table' ? (dineInType === 'tab' ? 'tab' : 'table') : orderType,
          status: 'pending',
          print_status: autoPrint ? 'pending' : 'disabled',
          total: orderTotal,
          notes: notes || null,
          order_number: newOrderNumber,
          payment_method: paymentMethod,
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

      toast({
        title: 'Pedido criado!',
        description: `Pedido #${newOrderNumber} criado com sucesso.`,
      });

      resetForm();
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl">Novo Pedido</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Products */}
          <div className="flex-1 flex flex-col p-4 border-r overflow-hidden">
            {/* Order Type Tabs */}
            <Tabs value={orderType} onValueChange={(v) => setOrderType(v as OrderType)} className="mb-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="counter" className="gap-1 text-xs sm:text-sm">
                  <Store className="w-4 h-4" />
                  <span className="hidden sm:inline">Balcão</span>
                </TabsTrigger>
                <TabsTrigger value="takeaway" className="gap-1 text-xs sm:text-sm">
                  <PackageCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Retirada</span>
                </TabsTrigger>
                <TabsTrigger value="table" className="gap-1 text-xs sm:text-sm">
                  <UtensilsCrossed className="w-4 h-4" />
                  <span className="hidden sm:inline">Local</span>
                </TabsTrigger>
                <TabsTrigger value="delivery" className="gap-1 text-xs sm:text-sm">
                  <MapPin className="w-4 h-4" />
                  <span className="hidden sm:inline">Entrega</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 flex-shrink-0">
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
                <div className="grid grid-cols-2 gap-2">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => addToCart(product)}
                    >
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <p className="text-sm text-primary font-semibold">
                        {formatCurrency(product.price)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Panel - Cart & Details */}
          <div className="w-96 flex flex-col overflow-hidden">
            {/* Order Details */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {/* Phone field - always shown for delivery */}
                {orderType === 'delivery' && (
                  <div className="space-y-2">
                    <Label>Telefone *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <Input
                        placeholder="(00) 00000-0000"
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(formatPhone(e.target.value));
                          if (customerFound) {
                            setCustomerFound(false);
                            setCustomerId(null);
                          }
                        }}
                        onFocus={() => {
                          if (customerSuggestions.length > 0) {
                            setShowSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          // Delay to allow click on suggestion
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        className="pl-10 pr-10"
                        maxLength={15}
                      />
                      {searchingCustomer && !customerFound && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      {customerFound && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                      )}
                      
                      {/* Customer suggestions dropdown */}
                      {showSuggestions && customerSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                          {customerSuggestions.map((customer) => (
                            <div
                              key={customer.id}
                              className="px-3 py-2 cursor-pointer hover:bg-accent transition-colors border-b last:border-b-0"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectCustomer(customer);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{customer.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatPhone(customer.phone)}
                                </span>
                              </div>
                              {customer.neighborhood && (
                                <span className="text-xs text-muted-foreground">
                                  {customer.neighborhood}
                                  {customer.city && ` - ${customer.city}`}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {customerFound && (
                      <Badge variant="secondary" className="text-xs">
                        Cliente cadastrado
                      </Badge>
                    )}
                  </div>
                )}

                {/* Customer Name */}
                <div className="space-y-2">
                  <Label>{orderType === 'delivery' ? 'Nome do cliente *' : 'Nome do cliente'}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder={orderType === 'delivery' ? 'Nome completo' : 'Cliente (opcional)'}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {orderType === 'table' && (
                  <div className="space-y-3">
                    {/* Dine-in type selector */}
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <RadioGroup
                        value={dineInType}
                        onValueChange={(v) => setDineInType(v as DineInType)}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="table" id="table-type" />
                          <Label htmlFor="table-type" className="flex items-center gap-1 cursor-pointer">
                            <UtensilsCrossed className="w-4 h-4" />
                            Mesa
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="tab" id="tab-type" />
                          <Label htmlFor="tab-type" className="flex items-center gap-1 cursor-pointer">
                            <ClipboardList className="w-4 h-4" />
                            Comanda
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    {dineInType === 'table' ? (
                      <div className="space-y-2">
                        <Label>Mesa</Label>
                        <Select value={selectedTable} onValueChange={setSelectedTable}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a mesa" />
                          </SelectTrigger>
                          <SelectContent>
                            {tables.map((table) => (
                              <SelectItem key={table.id} value={table.id}>
                                Mesa {table.number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Comanda</Label>
                        <Select value={selectedTab} onValueChange={setSelectedTab}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a comanda" />
                          </SelectTrigger>
                          <SelectContent>
                            {tabs.map((tab) => (
                              <SelectItem key={tab.id} value={tab.id}>
                                Comanda {tab.number} {tab.customer_name ? `- ${tab.customer_name}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {orderType === 'delivery' && (
                  <>
                    <Separator />
                    <p className="text-sm font-semibold text-muted-foreground">Endereço de Entrega</p>
                    
                    {/* CEP */}
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <div className="relative">
                        <Input
                          placeholder="00000-000"
                          value={cep}
                          onChange={(e) => handleCepChange(e.target.value)}
                          maxLength={9}
                        />
                        {loadingCep && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <Label>Rua *</Label>
                      <Input
                        placeholder="Nome da rua"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>

                    {/* Number and Complement */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Número</Label>
                        <Input
                          placeholder="Nº"
                          value={addressNumber}
                          onChange={(e) => setAddressNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Complemento</Label>
                        <Input
                          placeholder="Apto, bloco..."
                          value={complement}
                          onChange={(e) => setComplement(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Neighborhood and City */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label>Bairro *</Label>
                        <Input
                          placeholder="Bairro"
                          value={neighborhood}
                          onChange={(e) => handleNeighborhoodChange(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cidade</Label>
                        <Input
                          placeholder="Cidade"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Delivery Fee */}
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Taxa de entrega:</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(deliveryFee)}
                      </span>
                    </div>
                  </>
                )}

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentMethods.map((method) => (
                      <Button
                        key={method.id}
                        type="button"
                        variant={paymentMethod === method.id ? 'default' : 'outline'}
                        size="sm"
                        className="flex flex-col items-center gap-1 h-auto py-2"
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        {method.icon}
                        <span className="text-xs">{method.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Observações do pedido"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <Separator />

                {/* Cart Items */}
                <p className="text-sm font-semibold text-muted-foreground">Itens do Pedido</p>
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <ShoppingCart className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm">Carrinho vazio</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.product.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Total & Submit */}
            <div className="p-4 border-t space-y-3">
              {orderType === 'delivery' && deliveryFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
              )}
              {orderType === 'delivery' && deliveryFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span>Taxa de entrega:</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(orderTotal)}
                </span>
              </div>
              <Button
                className="w-full"
                disabled={cart.length === 0 || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Criar Pedido
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
