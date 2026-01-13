import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useDeliveryNotifications } from '@/hooks/useDeliveryNotifications';
import { PrintReceipt } from '@/components/PrintReceipt';
import { PrintKitchen } from '@/components/PrintKitchen';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Truck, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  User, 
  Clock,
  Package,
  Loader2,
  RefreshCw,
  DollarSign,
  Pencil,
  Trash2,
  Bike
} from 'lucide-react';

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

interface Product {
  id: string;
  name: string;
  price: number;
  is_available: boolean | null;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}

interface Order {
  id: string;
  customer_name: string | null;
  status: string | null;
  total: number | null;
  delivery_fee: number | null;
  created_at: string;
  delivery_address: string | null;
  delivery_phone: string | null;
  notes: string | null;
  driver_id: string | null;
  order_items?: { product_name: string; quantity: number; product_price: number }[];
}

interface DeliveryDriver {
  id: string;
  name: string;
  phone: string | null;
  vehicle_type: string | null;
  status: string | null;
}

interface DeliveryFee {
  id: string;
  neighborhood: string;
  city: string | null;
  fee: number;
  min_order_value: number | null;
  estimated_time: string | null;
  is_active: boolean | null;
}

export default function Deliveries() {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([]);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false);
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [fetchingCep, setFetchingCep] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Real-time notifications for new delivery orders
  const handleNewOrder = useCallback(() => {
    // Refresh orders list when new order arrives
    fetchDataRef.current?.();
  }, []);

  useDeliveryNotifications({
    restaurantId: restaurant?.id,
    enabled: notificationsEnabled,
    onNewOrder: handleNewOrder,
    playSound: true,
  });

  // Store fetchData in a ref so callback can access latest version
  const fetchDataRef = useRef<() => Promise<void>>();

  // Customer form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCep, setCustomerCep] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [customerComplement, setCustomerComplement] = useState('');
  const [customerNeighborhood, setCustomerNeighborhood] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Order form
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedDeliveryFee, setSelectedDeliveryFee] = useState<DeliveryFee | null>(null);

  // Delivery fee form
  const [editingFee, setEditingFee] = useState<DeliveryFee | null>(null);
  const [feeNeighborhood, setFeeNeighborhood] = useState('');
  const [feeCity, setFeeCity] = useState('');
  const [feeValue, setFeeValue] = useState('');
  const [feeMinOrder, setFeeMinOrder] = useState('');
  const [feeEstimatedTime, setFeeEstimatedTime] = useState('');

  const fetchData = async () => {
    if (!restaurant?.id) return;

    try {
      const [ordersRes, customersRes, productsRes, feesRes, driversRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*, order_items(product_name, quantity, product_price)')
          .eq('order_type', 'delivery')
          .order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('name'),
        supabase.from('products').select('*').eq('is_available', true).order('name'),
        supabase.from('delivery_fees').select('*').order('neighborhood'),
        supabase.from('delivery_drivers').select('*').eq('status', 'active').order('name'),
      ]);

      setOrders(ordersRes.data || []);
      setCustomers(customersRes.data || []);
      setProducts(productsRes.data || []);
      setDeliveryFees(feesRes.data || []);
      setDrivers(driversRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Store fetchData in ref for realtime callback
  fetchDataRef.current = fetchData;

  useEffect(() => {
    fetchData();
  }, [restaurant?.id]);

  // Auto-select delivery fee when neighborhood is filled
  useEffect(() => {
    if (customerNeighborhood && deliveryFees.length > 0) {
      const matchingFee = deliveryFees.find(
        f => f.neighborhood.toLowerCase() === customerNeighborhood.toLowerCase() && f.is_active
      );
      setSelectedDeliveryFee(matchingFee || null);
    }
  }, [customerNeighborhood, deliveryFees]);

  const resetCustomerForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerCep('');
    setCustomerAddress('');
    setCustomerNumber('');
    setCustomerComplement('');
    setCustomerNeighborhood('');
    setCustomerCity('');
    setCustomerState('');
    setSelectedCustomer(null);
    setSelectedDeliveryFee(null);
  };

  const resetOrderForm = () => {
    setOrderItems([]);
    setOrderNotes('');
    resetCustomerForm();
  };

  const resetFeeForm = () => {
    setFeeNeighborhood('');
    setFeeCity('');
    setFeeValue('');
    setFeeMinOrder('');
    setFeeEstimatedTime('');
    setEditingFee(null);
  };

  const searchCustomerByPhone = async () => {
    if (!searchPhone.trim()) return;

    const customer = customers.find(c => c.phone.replace(/\D/g, '') === searchPhone.replace(/\D/g, ''));
    
    if (customer) {
      setSelectedCustomer(customer);
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone);
      setCustomerCep(customer.cep || '');
      setCustomerAddress(customer.address || '');
      setCustomerNumber(customer.number || '');
      setCustomerComplement(customer.complement || '');
      setCustomerNeighborhood(customer.neighborhood || '');
      setCustomerCity(customer.city || '');
      setCustomerState(customer.state || '');
      toast({ title: 'Cliente encontrado!' });
    } else {
      toast({ 
        title: 'Cliente não encontrado',
        description: 'Preencha os dados para cadastrar um novo cliente.'
      });
      setCustomerPhone(searchPhone);
    }
  };

  const fetchAddressByCep = async () => {
    const cep = customerCep.replace(/\D/g, '');
    if (cep.length !== 8) {
      toast({ variant: 'destructive', title: 'CEP inválido', description: 'O CEP deve ter 8 dígitos.' });
      return;
    }

    setFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({ variant: 'destructive', title: 'CEP não encontrado' });
        return;
      }

      setCustomerAddress(data.logradouro || '');
      setCustomerNeighborhood(data.bairro || '');
      setCustomerCity(data.localidade || '');
      setCustomerState(data.uf || '');
      toast({ title: 'Endereço preenchido!' });
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao buscar CEP' });
    } finally {
      setFetchingCep(false);
    }
  };

  const addItemToOrder = (product: Product) => {
    const existing = orderItems.find(item => item.product_id === product.id);
    if (existing) {
      setOrderItems(prev => prev.map(item => 
        item.product_id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setOrderItems(prev => [...prev, {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        quantity: 1
      }]);
    }
  };

  const removeItemFromOrder = (productId: string) => {
    setOrderItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromOrder(productId);
      return;
    }
    setOrderItems(prev => prev.map(item => 
      item.product_id === productId ? { ...item, quantity } : item
    ));
  };

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + item.product_price * item.quantity, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + (selectedDeliveryFee?.fee || 0);
  };

  const saveCustomer = async (): Promise<Customer | null> => {
    if (!customerName || !customerPhone) {
      toast({ variant: 'destructive', title: 'Preencha nome e telefone' });
      return null;
    }

    try {
      if (selectedCustomer) {
        const { data, error } = await supabase
          .from('customers')
          .update({
            name: customerName,
            phone: customerPhone,
            cep: customerCep || null,
            address: customerAddress || null,
            number: customerNumber || null,
            complement: customerComplement || null,
            neighborhood: customerNeighborhood || null,
            city: customerCity || null,
            state: customerState || null,
          })
          .eq('id', selectedCustomer.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('customers')
          .insert({
            restaurant_id: restaurant?.id,
            name: customerName,
            phone: customerPhone,
            cep: customerCep || null,
            address: customerAddress || null,
            number: customerNumber || null,
            complement: customerComplement || null,
            neighborhood: customerNeighborhood || null,
            city: customerCity || null,
            state: customerState || null,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar cliente', description: error.message });
      return null;
    }
  };

  const createOrder = async () => {
    if (orderItems.length === 0) {
      toast({ variant: 'destructive', title: 'Adicione itens ao pedido' });
      return;
    }

    if (!customerName || !customerPhone || !customerAddress) {
      toast({ variant: 'destructive', title: 'Preencha os dados do cliente e endereço' });
      return;
    }

    // Check minimum order value
    if (selectedDeliveryFee?.min_order_value && calculateSubtotal() < selectedDeliveryFee.min_order_value) {
      toast({ 
        variant: 'destructive', 
        title: 'Pedido mínimo não atingido',
        description: `O pedido mínimo para ${selectedDeliveryFee.neighborhood} é ${formatCurrency(selectedDeliveryFee.min_order_value)}`
      });
      return;
    }

    setSaving(true);
    try {
      const customer = await saveCustomer();
      if (!customer) {
        setSaving(false);
        return;
      }

      const fullAddress = [
        customerAddress,
        customerNumber && `Nº ${customerNumber}`,
        customerComplement,
        customerNeighborhood,
        customerCity && customerState && `${customerCity}/${customerState}`,
        customerCep && `CEP: ${customerCep}`
      ].filter(Boolean).join(', ');

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant?.id,
          order_type: 'delivery',
          status: 'pending',
          customer_name: customerName,
          customer_id: customer.id,
          delivery_address: fullAddress,
          delivery_phone: customerPhone,
          delivery_fee: selectedDeliveryFee?.fee || 0,
          total: calculateTotal(),
          notes: orderNotes || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const itemsToInsert = orderItems.map(item => ({
        order_id: order.id,
        restaurant_id: restaurant?.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_price: item.product_price,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({ title: 'Pedido de entrega criado!' });
      setShowNewOrderDialog(false);
      resetOrderForm();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar pedido', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const saveFee = async () => {
    if (!feeNeighborhood || !feeValue) {
      toast({ variant: 'destructive', title: 'Preencha bairro e valor da taxa' });
      return;
    }

    setSaving(true);
    try {
      const feeData = {
        restaurant_id: restaurant?.id,
        neighborhood: feeNeighborhood,
        city: feeCity || null,
        fee: parseFloat(feeValue),
        min_order_value: feeMinOrder ? parseFloat(feeMinOrder) : null,
        estimated_time: feeEstimatedTime || null,
        is_active: true,
      };

      if (editingFee) {
        const { error } = await supabase
          .from('delivery_fees')
          .update(feeData)
          .eq('id', editingFee.id);
        if (error) throw error;
        toast({ title: 'Taxa atualizada!' });
      } else {
        const { error } = await supabase
          .from('delivery_fees')
          .insert(feeData);
        if (error) throw error;
        toast({ title: 'Taxa criada!' });
      }

      setShowFeeDialog(false);
      resetFeeForm();
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar taxa', description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleFeeStatus = async (fee: DeliveryFee) => {
    try {
      const { error } = await supabase
        .from('delivery_fees')
        .update({ is_active: !fee.is_active })
        .eq('id', fee.id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: error.message });
    }
  };

  const deleteFee = async (id: string) => {
    try {
      const { error } = await supabase
        .from('delivery_fees')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Taxa excluída!' });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    }
  };

  const openEditFee = (fee: DeliveryFee) => {
    setEditingFee(fee);
    setFeeNeighborhood(fee.neighborhood);
    setFeeCity(fee.city || '');
    setFeeValue(fee.fee.toString());
    setFeeMinOrder(fee.min_order_value?.toString() || '');
    setFeeEstimatedTime(fee.estimated_time || '');
    setShowFeeDialog(true);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      toast({ title: `Status atualizado para ${getStatusLabel(status)}` });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: error.message });
    }
  };

  const assignDriver = async (orderId: string, driverId: string | null) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ driver_id: driverId || null })
        .eq('id', orderId);

      if (error) throw error;
      
      const driverName = driverId 
        ? drivers.find(d => d.id === driverId)?.name 
        : null;
      
      toast({ 
        title: driverName 
          ? `Motoboy ${driverName} atribuído` 
          : 'Motoboy removido do pedido' 
      });
      fetchData();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao atribuir motoboy', description: error.message });
    }
  };

  const getDriverName = (driverId: string | null) => {
    if (!driverId) return null;
    return drivers.find(d => d.id === driverId)?.name || null;
  };

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      preparing: 'Preparando',
      ready: 'Pronto',
      delivering: 'Em entrega',
      delivered: 'Entregue',
      cancelled: 'Cancelado',
    };
    return labels[status || 'pending'] || status;
  };

  const getStatusColor = (status: string | null) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      preparing: 'bg-blue-500',
      ready: 'bg-purple-500',
      delivering: 'bg-orange-500',
      delivered: 'bg-success',
      cancelled: 'bg-destructive',
    };
    return colors[status || 'pending'] || 'bg-muted';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing' || o.status === 'ready');
  const deliveringOrders = orders.filter(o => o.status === 'delivering');

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Entregas</h1>
            <p className="text-muted-foreground">Gerencie pedidos para entrega</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
              <span className="text-sm text-muted-foreground">Notificações</span>
              <Switch 
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
              {notificationsEnabled && (
                <Badge variant="outline" className="text-xs border-success text-success">
                  🔔 Ativo
                </Badge>
              )}
            </div>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Pedido
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Novo Pedido de Entrega</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 md:grid-cols-2 pt-4">
                  {/* Customer Data */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="w-4 h-4" /> Dados do Cliente
                    </h3>
                    
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Buscar por telefone..."
                        value={searchPhone}
                        onChange={(e) => setSearchPhone(e.target.value)}
                      />
                      <Button variant="outline" onClick={searchCustomerByPhone}>
                        <Search className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label>Nome *</Label>
                        <Input 
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Nome completo"
                        />
                      </div>
                      <div>
                        <Label>Telefone *</Label>
                        <Input 
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>

                    <h3 className="font-semibold flex items-center gap-2 pt-2">
                      <MapPin className="w-4 h-4" /> Endereço de Entrega
                    </h3>

                    <div className="flex gap-2">
                      <Input 
                        placeholder="CEP"
                        value={customerCep}
                        onChange={(e) => setCustomerCep(e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        onClick={fetchAddressByCep}
                        disabled={fetchingCep}
                      >
                        {fetchingCep ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Label>Rua *</Label>
                        <Input 
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Número</Label>
                        <Input 
                          value={customerNumber}
                          onChange={(e) => setCustomerNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Complemento</Label>
                      <Input 
                        value={customerComplement}
                        onChange={(e) => setCustomerComplement(e.target.value)}
                        placeholder="Apt, Bloco..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Bairro</Label>
                        <Input 
                          value={customerNeighborhood}
                          onChange={(e) => setCustomerNeighborhood(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Cidade</Label>
                        <Input 
                          value={customerCity}
                          onChange={(e) => setCustomerCity(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Estado</Label>
                      <Input 
                        value={customerState}
                        onChange={(e) => setCustomerState(e.target.value)}
                        maxLength={2}
                        className="w-20"
                      />
                    </div>

                    {/* Delivery Fee Info */}
                    {customerNeighborhood && (
                      <Card className={selectedDeliveryFee ? 'border-success' : 'border-warning'}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4" />
                              <span className="text-sm font-medium">Taxa de Entrega</span>
                            </div>
                            {selectedDeliveryFee ? (
                              <div className="text-right">
                                <span className="font-bold text-success">
                                  {formatCurrency(selectedDeliveryFee.fee)}
                                </span>
                                {selectedDeliveryFee.estimated_time && (
                                  <p className="text-xs text-muted-foreground">
                                    ~{selectedDeliveryFee.estimated_time}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-warning">
                                Bairro não cadastrado
                              </span>
                            )}
                          </div>
                          {selectedDeliveryFee?.min_order_value && selectedDeliveryFee.min_order_value > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Pedido mínimo: {formatCurrency(selectedDeliveryFee.min_order_value)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Products */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Package className="w-4 h-4" /> Produtos
                    </h3>

                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                      {products.map(product => (
                        <div 
                          key={product.id}
                          className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                          onClick={() => addItemToOrder(product)}
                        >
                          <span className="text-sm">{product.name}</span>
                          <span className="text-sm font-medium">{formatCurrency(product.price)}</span>
                        </div>
                      ))}
                    </div>

                    <h4 className="font-medium pt-2">Itens do Pedido</h4>
                    {orderItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Clique nos produtos para adicionar</p>
                    ) : (
                      <div className="space-y-2">
                        {orderItems.map(item => (
                          <div key={item.product_id} className="flex items-center justify-between p-2 bg-muted rounded">
                            <span className="text-sm flex-1">{item.product_name}</span>
                            <div className="flex items-center gap-2">
                              <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-6 w-6"
                                onClick={() => updateItemQuantity(item.product_id, item.quantity - 1)}
                              >
                                -
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button 
                                size="icon" 
                                variant="outline" 
                                className="h-6 w-6"
                                onClick={() => updateItemQuantity(item.product_id, item.quantity + 1)}
                              >
                                +
                              </Button>
                              <span className="text-sm font-medium w-20 text-right">
                                {formatCurrency(item.product_price * item.quantity)}
                              </span>
                            </div>
                          </div>
                        ))}
                        
                        <div className="space-y-1 pt-2 border-t">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal</span>
                            <span>{formatCurrency(calculateSubtotal())}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Taxa de Entrega</span>
                            <span>{formatCurrency(selectedDeliveryFee?.fee || 0)}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-lg pt-1">
                            <span>Total</span>
                            <span>{formatCurrency(calculateTotal())}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label>Observações</Label>
                      <Input 
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="Observações do pedido..."
                      />
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={createOrder}
                      disabled={saving || orderItems.length === 0}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Criar Pedido
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pendentes</CardDescription>
              <CardTitle className="text-2xl text-yellow-500">{pendingOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Preparando</CardDescription>
              <CardTitle className="text-2xl text-blue-500">{preparingOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Em Entrega</CardDescription>
              <CardTitle className="text-2xl text-orange-500">{deliveringOrders.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Clientes Cadastrados</CardDescription>
              <CardTitle className="text-2xl">{customers.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="fees">Taxas de Entrega</TabsTrigger>
            <TabsTrigger value="customers">Clientes</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4">
            {orders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Truck className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">Nenhum pedido de entrega</h3>
                  <p className="text-muted-foreground">Crie um novo pedido para começar</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {orders.map(order => (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <Badge className={getStatusColor(order.status)}>
                              {getStatusLabel(order.status)}
                            </Badge>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(order.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{order.customer_name}</span>
                          </div>
                          {order.delivery_phone && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="w-4 h-4" />
                              {order.delivery_phone}
                            </div>
                          )}
                          {order.delivery_address && (
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4 mt-0.5" />
                              <span>{order.delivery_address}</span>
                            </div>
                          )}
                          {order.order_items && order.order_items.length > 0 && (
                            <div className="text-sm pt-2">
                              <span className="text-muted-foreground">Itens: </span>
                              {order.order_items.map((item, i) => (
                                <span key={i}>
                                  {item.quantity}x {item.product_name}
                                  {i < order.order_items!.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          )}
                          {order.delivery_fee && order.delivery_fee > 0 && (
                            <div className="text-sm text-muted-foreground">
                              Taxa de entrega: {formatCurrency(order.delivery_fee)}
                            </div>
                          )}
                          {/* Driver info */}
                          {order.driver_id && getDriverName(order.driver_id) && (
                            <div className="flex items-center gap-2 text-sm pt-1">
                              <Bike className="w-4 h-4 text-primary" />
                              <span className="font-medium text-primary">
                                {getDriverName(order.driver_id)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-lg font-bold">
                            {formatCurrency(order.total || 0)}
                          </span>
                          <Select 
                            value={order.status || 'pending'} 
                            onValueChange={(status) => updateOrderStatus(order.id, status)}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="preparing">Preparando</SelectItem>
                              <SelectItem value="ready">Pronto</SelectItem>
                              <SelectItem value="delivering">Em entrega</SelectItem>
                              <SelectItem value="delivered">Entregue</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                          {/* Driver selector */}
                          <Select 
                            value={order.driver_id || 'none'} 
                            onValueChange={(value) => assignDriver(order.id, value === 'none' ? null : value)}
                          >
                            <SelectTrigger className="w-36">
                              <div className="flex items-center gap-2">
                                <Bike className="w-4 h-4" />
                                <span className="truncate">
                                  {order.driver_id ? getDriverName(order.driver_id) || 'Motoboy' : 'Motoboy'}
                                </span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-muted-foreground">Sem motoboy</span>
                              </SelectItem>
                              {drivers.map(driver => (
                                <SelectItem key={driver.id} value={driver.id}>
                                  <div className="flex items-center gap-2">
                                    <Bike className="w-4 h-4" />
                                    {driver.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-2">
                            <PrintReceipt order={order} restaurantName={restaurant?.name} />
                            <PrintKitchen order={order} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="fees" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Taxas por Bairro</CardTitle>
                  <CardDescription>Configure as taxas de entrega por região</CardDescription>
                </div>
                <Dialog open={showFeeDialog} onOpenChange={(open) => {
                  setShowFeeDialog(open);
                  if (!open) resetFeeForm();
                }}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Nova Taxa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingFee ? 'Editar Taxa' : 'Nova Taxa de Entrega'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Bairro *</Label>
                          <Input 
                            value={feeNeighborhood}
                            onChange={(e) => setFeeNeighborhood(e.target.value)}
                            placeholder="Ex: Centro"
                          />
                        </div>
                        <div>
                          <Label>Cidade</Label>
                          <Input 
                            value={feeCity}
                            onChange={(e) => setFeeCity(e.target.value)}
                            placeholder="Ex: São Paulo"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Taxa de Entrega *</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={feeValue}
                            onChange={(e) => setFeeValue(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label>Pedido Mínimo</Label>
                          <Input 
                            type="number"
                            step="0.01"
                            value={feeMinOrder}
                            onChange={(e) => setFeeMinOrder(e.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Tempo Estimado</Label>
                        <Input 
                          value={feeEstimatedTime}
                          onChange={(e) => setFeeEstimatedTime(e.target.value)}
                          placeholder="Ex: 30-45 min"
                        />
                      </div>
                      <Button className="w-full" onClick={saveFee} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {editingFee ? 'Salvar Alterações' : 'Criar Taxa'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                {deliveryFees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold text-lg">Nenhuma taxa cadastrada</h3>
                    <p className="text-muted-foreground">Adicione taxas por bairro</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bairro</TableHead>
                        <TableHead>Cidade</TableHead>
                        <TableHead className="text-right">Taxa</TableHead>
                        <TableHead className="text-right">Pedido Mínimo</TableHead>
                        <TableHead>Tempo</TableHead>
                        <TableHead className="text-center">Ativo</TableHead>
                        <TableHead className="w-24"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryFees.map(fee => (
                        <TableRow key={fee.id}>
                          <TableCell className="font-medium">{fee.neighborhood}</TableCell>
                          <TableCell>{fee.city || '-'}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(fee.fee)}
                          </TableCell>
                          <TableCell className="text-right">
                            {fee.min_order_value ? formatCurrency(fee.min_order_value) : '-'}
                          </TableCell>
                          <TableCell>{fee.estimated_time || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={fee.is_active ?? true}
                              onCheckedChange={() => toggleFeeStatus(fee)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => openEditFee(fee)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => deleteFee(fee.id)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="mt-4">
            {customers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <User className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg">Nenhum cliente cadastrado</h3>
                  <p className="text-muted-foreground">Os clientes serão salvos automaticamente ao criar pedidos</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Bairro</TableHead>
                        <TableHead>Endereço</TableHead>
                        <TableHead>Cidade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map(customer => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.name}</TableCell>
                          <TableCell>{customer.phone}</TableCell>
                          <TableCell>{customer.neighborhood || '-'}</TableCell>
                          <TableCell>
                            {[customer.address, customer.number && `Nº ${customer.number}`]
                              .filter(Boolean).join(', ') || '-'}
                          </TableCell>
                          <TableCell>
                            {customer.city && customer.state 
                              ? `${customer.city}/${customer.state}` 
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
