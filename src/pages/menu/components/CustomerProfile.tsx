import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  Plus,
  Trash2,
  Star,
  Edit2,
  Save,
  X,
  Loader2,
  Home,
  AlertCircle,
  Check,
  ShoppingBag,
  Clock,
  ChevronRight,
  Package,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  cep: string | null;
}

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  number: string | null;
  complement: string | null;
  neighborhood: string;
  city: string;
  cep: string | null;
  is_default: boolean;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}

interface CustomerOrder {
  id: string;
  order_number: number | null;
  order_type: string | null;
  status: string | null;
  total: number | null;
  created_at: string;
  order_items?: OrderItem[];
}

interface CustomerProfileProps {
  restaurantId: string;
  restaurantName: string;
  restaurantLogo: string | null;
  onBack: () => void;
}

export function CustomerProfile({
  restaurantId,
  restaurantName,
  restaurantLogo,
  onBack,
}: CustomerProfileProps) {
  // Login state
  const [step, setStep] = useState<'login' | 'profile'>('login');
  const [phoneInput, setPhoneInput] = useState('');
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Customer data
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Edit mode
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // New address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    label: 'Casa',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    cep: '',
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Order history
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Format currency
  const formatCurrency = (value: number | null) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  // Format phone
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Format CEP
  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  // Handle login by phone
  const handleLogin = useCallback(async () => {
    const cleanPhone = phoneInput.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Informe um telefone válido');
      return;
    }

    setSearchingCustomer(true);
    try {
      // Use secure RPC function to lookup customer by phone
      const { data: existingCustomer, error } = await supabase
        .rpc('get_customer_by_phone', {
          _restaurant_id: restaurantId,
          _phone: cleanPhone,
        });

      if (error) throw error;

      // RPC returns an array, get first result
      const customer = Array.isArray(existingCustomer) ? existingCustomer[0] : existingCustomer;

      if (customer) {
        // Customer found via RPC - need to fetch full record for INSERT policy
        setCustomer({ ...customer, restaurant_id: restaurantId, phone: cleanPhone } as any);
        setEditName(customer.name);
        await fetchSavedAddresses(customer.id);
        setStep('profile');
        toast.success(`Bem-vindo de volta, ${customer.name}!`);
      } else {
        // Create new customer
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            restaurant_id: restaurantId,
            phone: cleanPhone,
            name: 'Cliente',
          })
          .select()
          .single();

        if (createError) throw createError;

        setCustomer(newCustomer);
        setEditName('Cliente');
        setEditingProfile(true); // Start in edit mode for new customers
        setStep('profile');
        toast.info('Complete seu perfil');
      }
    } catch (error) {
      console.error('Error searching customer:', error);
      toast.error('Erro ao buscar dados');
    } finally {
      setSearchingCustomer(false);
    }
  }, [phoneInput, restaurantId]);

  // Fetch saved addresses using secure RPC function
  const fetchSavedAddresses = useCallback(async (customerId: string) => {
    setLoadingAddresses(true);
    try {
      const { data, error } = await supabase
        .rpc('get_customer_addresses', {
          _restaurant_id: restaurantId,
          _customer_id: customerId,
        });

      if (error) throw error;
      setSavedAddresses(data || []);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  }, [restaurantId]);

  // Fetch order history
  const fetchOrderHistory = useCallback(async (customerId: string) => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          order_type,
          status,
          total,
          created_at,
          order_items (
            id,
            product_name,
            product_price,
            quantity
          )
        `)
        .eq('customer_id', customerId)
        .eq('restaurant_id', restaurantId)
        .not('status', 'in', '("cancelled")')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  }, [restaurantId]);

  // Fetch data when customer is set
  useEffect(() => {
    if (customer?.id && step === 'profile') {
      fetchOrderHistory(customer.id);
    }
  }, [customer?.id, step, fetchOrderHistory]);

  // Save profile
  const handleSaveProfile = useCallback(async () => {
    if (!customer || !editName.trim()) return;

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({ name: editName.trim() })
        .eq('id', customer.id);

      if (error) throw error;

      setCustomer((prev) => prev ? { ...prev, name: editName.trim() } : null);
      setEditingProfile(false);
      toast.success('Perfil atualizado');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSavingProfile(false);
    }
  }, [customer, editName]);

  // Handle CEP change
  const handleCepChange = useCallback(async (cep: string) => {
    const formattedCep = formatCep(cep);
    setAddressForm((prev) => ({ ...prev, cep: formattedCep }));
    setCepError(false);

    const cleanedCep = cep.replace(/\D/g, '');
    if (cleanedCep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const data = await response.json();
        if (data.erro) {
          setCepError(true);
          toast.error('CEP não encontrado');
        } else {
          setAddressForm((prev) => ({
            ...prev,
            cep: formattedCep,
            address: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
          }));
        }
      } catch (error) {
        console.error('Error fetching CEP:', error);
        setCepError(true);
        toast.error('Erro ao buscar CEP');
      } finally {
        setCepLoading(false);
      }
    }
  }, []);

  // Save address using secure RPC function
  const handleSaveAddress = useCallback(async () => {
    if (!customer || !addressForm.address || !addressForm.neighborhood) {
      toast.error('Preencha o endereço e bairro');
      return;
    }

    setSavingAddress(true);
    try {
      const { error } = await supabase.rpc('upsert_customer_address', {
        _restaurant_id: restaurantId,
        _customer_id: customer.id,
        _address_id: editingAddressId || null,
        _label: addressForm.label || 'Casa',
        _address: addressForm.address,
        _number: addressForm.number || null,
        _complement: addressForm.complement || null,
        _neighborhood: addressForm.neighborhood,
        _city: addressForm.city,
        _state: null,
        _cep: addressForm.cep || null,
        _is_default: savedAddresses.length === 0,
      });

      if (error) throw error;
      toast.success(editingAddressId ? 'Endereço atualizado' : 'Endereço salvo');

      // Refresh addresses
      await fetchSavedAddresses(customer.id);
      resetAddressForm();
    } catch (error) {
      console.error('Error saving address:', error);
      toast.error('Erro ao salvar endereço');
    } finally {
      setSavingAddress(false);
    }
  }, [customer, addressForm, editingAddressId, savedAddresses.length, restaurantId, fetchSavedAddresses]);

  // Reset address form
  const resetAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressForm({
      label: 'Casa',
      address: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      cep: '',
    });
    setCepError(false);
  };

  // Edit address
  const handleEditAddress = (addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      label: addr.label,
      address: addr.address,
      number: addr.number || '',
      complement: addr.complement || '',
      neighborhood: addr.neighborhood,
      city: addr.city,
      cep: addr.cep || '',
    });
    setShowAddressForm(true);
  };

  // Delete address using secure RPC function
  const handleDeleteAddress = useCallback(async (addressId: string) => {
    if (!customer) return;

    try {
      const { error } = await supabase.rpc('delete_customer_address', {
        _restaurant_id: restaurantId,
        _customer_id: customer.id,
        _address_id: addressId,
      });

      if (error) throw error;

      setSavedAddresses((prev) => prev.filter((a) => a.id !== addressId));
      toast.success('Endereço excluído');
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Erro ao excluir endereço');
    }
  }, [customer, restaurantId]);

  // Set default address using secure RPC function
  const handleSetDefaultAddress = useCallback(async (addressId: string) => {
    if (!customer) return;

    try {
      const { error } = await supabase.rpc('set_default_customer_address', {
        _restaurant_id: restaurantId,
        _customer_id: customer.id,
        _address_id: addressId,
      });

      if (error) throw error;

      setSavedAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === addressId,
        }))
      );

      toast.success('Endereço padrão definido');
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Erro ao definir padrão');
    }
  }, [customer, restaurantId]);

  // LOGIN STEP
  if (step === 'login') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            {restaurantLogo && (
              <img
                src={restaurantLogo}
                alt={restaurantName}
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            <span className="font-medium truncate">{restaurantName}</span>
          </div>
        </div>

        <div className="p-4 max-w-md mx-auto">
          <div className="text-center mb-8 mt-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Meu Perfil</h1>
            <p className="text-sm text-muted-foreground">
              Acesse com seu telefone para ver e editar seus dados e endereços
            </p>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4" />
                  Seu telefone
                </Label>
                <Input
                  id="phone"
                  placeholder="(00) 00000-0000"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(formatPhone(e.target.value))}
                  inputMode="tel"
                  className="h-12 text-lg"
                />
              </div>

              <Button
                className="w-full h-12"
                onClick={handleLogin}
                disabled={phoneInput.replace(/\D/g, '').length < 10 || searchingCustomer}
              >
                {searchingCustomer ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // PROFILE STEP
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep('login')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="font-medium">Meu Perfil</span>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-4">
        {/* Profile Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Dados Pessoais
              </CardTitle>
              {!editingProfile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingProfile(true)}
                  className="h-8 gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {editingProfile ? (
              <>
                <div>
                  <Label htmlFor="name" className="text-xs text-muted-foreground">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-10 mt-1"
                    placeholder="Seu nome"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveProfile}
                    disabled={savingProfile || !editName.trim()}
                    className="gap-1"
                  >
                    {savingProfile ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Salvar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingProfile(false);
                      setEditName(customer?.name || '');
                    }}
                    className="gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{customer?.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {formatPhone(customer?.phone || '')}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Addresses Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Endereços
              </CardTitle>
              {!showAddressForm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddressForm(true)}
                  className="h-8 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Novo
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Address Form */}
            {showAddressForm && (
              <div className="p-3 rounded-xl border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {editingAddressId ? 'Editar endereço' : 'Novo endereço'}
                  </span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetAddressForm}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div>
                  <Label htmlFor="label" className="text-xs text-muted-foreground">
                    Nome do endereço
                  </Label>
                  <Input
                    id="label"
                    placeholder="Ex: Casa, Trabalho..."
                    value={addressForm.label}
                    onChange={(e) => setAddressForm((prev) => ({ ...prev, label: e.target.value }))}
                    className="h-9 mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="cep" className="text-xs text-muted-foreground">
                      CEP
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="cep"
                        placeholder="00000-000"
                        value={addressForm.cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        maxLength={9}
                        inputMode="numeric"
                        className={cn('h-9', cepError && 'border-destructive')}
                      />
                      {cepLoading && (
                        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                      {cepError && !cepLoading && (
                        <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="neighborhood" className="text-xs text-muted-foreground">
                      Bairro *
                    </Label>
                    <Input
                      id="neighborhood"
                      placeholder="Bairro"
                      value={addressForm.neighborhood}
                      onChange={(e) =>
                        setAddressForm((prev) => ({ ...prev, neighborhood: e.target.value }))
                      }
                      className="h-9 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address" className="text-xs text-muted-foreground">
                    Rua/Avenida *
                  </Label>
                  <Input
                    id="address"
                    placeholder="Nome da rua"
                    value={addressForm.address}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, address: e.target.value }))
                    }
                    className="h-9 mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="number" className="text-xs text-muted-foreground">
                      Número
                    </Label>
                    <Input
                      id="number"
                      placeholder="123"
                      value={addressForm.number}
                      onChange={(e) =>
                        setAddressForm((prev) => ({ ...prev, number: e.target.value }))
                      }
                      className="h-9 mt-1"
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <Label htmlFor="complement" className="text-xs text-muted-foreground">
                      Complemento
                    </Label>
                    <Input
                      id="complement"
                      placeholder="Apt, Bloco..."
                      value={addressForm.complement}
                      onChange={(e) =>
                        setAddressForm((prev) => ({ ...prev, complement: e.target.value }))
                      }
                      className="h-9 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="city" className="text-xs text-muted-foreground">
                    Cidade
                  </Label>
                  <Input
                    id="city"
                    placeholder="Cidade"
                    value={addressForm.city}
                    onChange={(e) =>
                      setAddressForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="h-9 mt-1"
                  />
                </div>

                <Button
                  size="sm"
                  className="w-full gap-1"
                  onClick={handleSaveAddress}
                  disabled={savingAddress || !addressForm.address || !addressForm.neighborhood}
                >
                  {savingAddress ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {editingAddressId ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            )}

            {/* Address List */}
            {loadingAddresses ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : savedAddresses.length === 0 && !showAddressForm ? (
              <div className="text-center py-6">
                <Home className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum endereço salvo</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1"
                  onClick={() => setShowAddressForm(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar endereço
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {savedAddresses.map((addr) => {
                  const fullAddress = [
                    addr.address,
                    addr.number,
                    addr.complement,
                    addr.neighborhood,
                    addr.city,
                  ]
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <div
                      key={addr.id}
                      className={cn(
                        'relative p-3 rounded-xl border transition-all',
                        addr.is_default && 'border-primary/50 bg-primary/5'
                      )}
                    >
                      <div className="pr-20">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{addr.label}</span>
                          {addr.is_default && (
                            <Badge variant="secondary" className="text-[10px] h-4 gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              Padrão
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{fullAddress}</p>
                        {addr.cep && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            CEP: {addr.cep}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary"
                          onClick={() => handleEditAddress(addr)}
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {!addr.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            title="Definir como padrão"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteAddress(addr.id)}
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order History Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Histórico de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingOrders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-6">
                <Receipt className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum pedido encontrado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Seus pedidos aparecerão aqui
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const orderDate = new Date(order.created_at);
                  
                  const getStatusBadge = (status: string | null) => {
                    switch (status) {
                      case 'pending':
                        return <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">Pendente</Badge>;
                      case 'preparing':
                        return <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">Preparando</Badge>;
                      case 'ready':
                        return <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Pronto</Badge>;
                      case 'delivered':
                        return <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">Entregue</Badge>;
                      case 'closed':
                        return <Badge variant="outline" className="text-[10px] bg-gray-500/10 text-gray-600 border-gray-500/30">Concluído</Badge>;
                      default:
                        return <Badge variant="outline" className="text-[10px]">{status || 'N/A'}</Badge>;
                    }
                  };

                  const getOrderTypeLabel = (type: string | null) => {
                    switch (type) {
                      case 'delivery': return 'Delivery';
                      case 'takeaway': return 'Retirada';
                      case 'table': return 'Mesa';
                      case 'counter': return 'Balcão';
                      default: return type || 'Pedido';
                    }
                  };

                  return (
                    <div
                      key={order.id}
                      className={cn(
                        'rounded-xl border transition-all overflow-hidden',
                        isExpanded ? 'bg-muted/30' : 'hover:bg-muted/20'
                      )}
                    >
                      <button
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="w-full p-3 flex items-center gap-3 text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm">
                              #{order.order_number || '---'}
                            </span>
                            {getStatusBadge(order.status)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{getOrderTypeLabel(order.order_type)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(orderDate, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm">{formatCurrency(order.total)}</p>
                          <ChevronRight className={cn(
                            'w-4 h-4 text-muted-foreground transition-transform mx-auto',
                            isExpanded && 'rotate-90'
                          )} />
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && order.order_items && order.order_items.length > 0 && (
                        <div className="px-3 pb-3 border-t bg-background/50">
                          <div className="pt-3 space-y-1.5">
                            {order.order_items.map((item) => (
                              <div key={item.id} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">
                                  {item.quantity}x {item.product_name}
                                </span>
                                <span className="text-foreground font-medium">
                                  {formatCurrency(item.product_price * item.quantity)}
                                </span>
                              </div>
                            ))}
                            <Separator className="my-2" />
                            <div className="flex justify-between text-sm font-medium">
                              <span>Total</span>
                              <span className="text-primary">{formatCurrency(order.total)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back to Menu Button */}
        <Button variant="outline" className="w-full" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao cardápio
        </Button>
      </div>
    </div>
  );
}
