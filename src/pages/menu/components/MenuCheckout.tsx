import { CustomerInfo, OrderType, MenuSettings, formatCurrency, isRestaurantOpen } from '../types';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState, useEffect, useCallback } from 'react';
import { Bike, Package, MapPin, User, Phone, Loader2, MessageCircle, AlertCircle, Clock, ArrowRight, CheckCircle2, Info, Truck, ChevronLeft, MessageSquare, Home, Plus, Banknote, CreditCard, QrCode, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SavedAddressesList } from './SavedAddressesList';

type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';

interface DeliveryFeeData {
  fee: number;
  neighborhood: string;
  estimated_time: string | null;
  min_order_value: number | null;
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

export interface PaymentInfo {
  method: PaymentMethod;
  needsChange: boolean;
  changeFor: number | null;
}

interface MenuCheckoutProps {
  open: boolean;
  onClose: () => void;
  total: number;
  onSubmit: (orderType: OrderType, customerInfo: CustomerInfo, customerId: string | null, deliveryFee: number, orderNotes: string, paymentInfo: PaymentInfo) => void;
  loading: boolean;
  menuSettings: MenuSettings;
  restaurantId: string;
}

type CheckoutStep = 'phone' | 'details';
type AddressMode = 'list' | 'form';

export function MenuCheckout({
  open,
  onClose,
  total,
  onSubmit,
  loading,
  menuSettings,
  restaurantId,
}: MenuCheckoutProps) {
  const deliveryEnabled = menuSettings.digital_menu_delivery_enabled;
  const pickupEnabled = menuSettings.digital_menu_pickup_enabled;
  const minOrderValue = menuSettings.digital_menu_min_order_value || 0;
  const openStatus = isRestaurantOpen(menuSettings.opening_hours, menuSettings.use_opening_hours, menuSettings.is_open);

  const getDefaultOrderType = (): OrderType => {
    if (deliveryEnabled) return 'delivery';
    if (pickupEnabled) return 'takeaway';
    return 'delivery';
  };

  const [step, setStep] = useState<CheckoutStep>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  
  const [orderType, setOrderType] = useState<OrderType>(getDefaultOrderType());
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    cep: '',
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState(false);

  // Delivery fee state
  const [deliveryFeeData, setDeliveryFeeData] = useState<DeliveryFeeData | null>(null);
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);
  const [deliveryFeeNotFound, setDeliveryFeeNotFound] = useState(false);

  // Order notes state
  const [orderNotes, setOrderNotes] = useState('');

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [needsChange, setNeedsChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');

  // Saved addresses state
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressMode, setAddressMode] = useState<AddressMode>('list');
  const [addressLabel, setAddressLabel] = useState('Casa');
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deliveryFeeCheckedNeighborhoods, setDeliveryFeeCheckedNeighborhoods] = useState<Set<string>>(new Set());

  // Calculate delivery fee
  const calculatedDeliveryFee = orderType === 'delivery' && deliveryFeeData ? deliveryFeeData.fee : 0;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('phone');
      setPhoneInput('');
      setCustomerId(null);
      setIsNewCustomer(false);
      setOrderType(getDefaultOrderType());
      setCustomerInfo({
        name: '',
        phone: '',
        address: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        cep: '',
      });
      setDeliveryFeeData(null);
      setDeliveryFeeNotFound(false);
      setOrderNotes('');
      setPaymentMethod('pix');
      setNeedsChange(false);
      setChangeFor('');
      setSavedAddresses([]);
      setSelectedAddressId(null);
      setAddressMode('list');
      setAddressLabel('Casa');
    }
  }, [open]);

  // Fetch saved addresses using secure RPC function
  const fetchSavedAddresses = useCallback(async (custId: string) => {
    setLoadingAddresses(true);
    try {
      const { data, error } = await supabase
        .rpc('get_customer_addresses', {
          _restaurant_id: restaurantId,
          _customer_id: custId,
        });

      if (error) throw error;
      setSavedAddresses(data || []);

      // Auto-select default address
      const defaultAddr = data?.find((a: SavedAddress) => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        applyAddressToForm(defaultAddr);
      }
    } catch (error) {
      console.error('Error fetching saved addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  }, [restaurantId]);

  // Apply saved address to form
  const applyAddressToForm = useCallback((addr: SavedAddress) => {
    setCustomerInfo((prev) => ({
      ...prev,
      address: addr.address,
      number: addr.number || '',
      complement: addr.complement || '',
      neighborhood: addr.neighborhood,
      city: addr.city,
      cep: addr.cep || '',
    }));
    // Trigger delivery fee lookup
    if (addr.neighborhood) {
      handleNeighborhoodChangeDirect(addr.neighborhood);
    }
  }, []);

  // Direct neighborhood change for saved addresses (no state update loop)
  const handleNeighborhoodChangeDirect = useCallback(async (neighborhood: string) => {
    if (!neighborhood.trim() || orderType !== 'delivery') {
      setDeliveryFeeData(null);
      setDeliveryFeeNotFound(false);
      return;
    }

    setDeliveryFeeLoading(true);
    try {
      const normalizedNeighborhood = neighborhood.toLowerCase().trim();

      const { data, error } = await supabase
        .from('delivery_fees')
        .select('fee, neighborhood, estimated_time, min_order_value')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .ilike('neighborhood', `%${normalizedNeighborhood}%`)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDeliveryFeeData(data);
        setDeliveryFeeNotFound(false);
      } else {
        setDeliveryFeeData(null);
        setDeliveryFeeNotFound(true);
      }
    } catch (error) {
      console.error('Error fetching delivery fee:', error);
      setDeliveryFeeNotFound(true);
    } finally {
      setDeliveryFeeLoading(false);
    }
  }, [restaurantId, orderType]);

  // Trigger delivery fee lookup when step changes to details with existing neighborhood
  useEffect(() => {
    const neighborhoodKey = `${customerInfo.neighborhood}-${orderType}`;
    
    if (step === 'details' && customerInfo.neighborhood && orderType === 'delivery' && !deliveryFeeCheckedNeighborhoods.has(neighborhoodKey)) {
      // Mark this neighborhood as checked to prevent re-triggers
      setDeliveryFeeCheckedNeighborhoods(prev => new Set(prev).add(neighborhoodKey));
      
      // Trigger the lookup
      const fetchDeliveryFee = async () => {
        setDeliveryFeeLoading(true);
        try {
          const normalizedNeighborhood = customerInfo.neighborhood.toLowerCase().trim();
          
          const { data, error } = await supabase
            .from('delivery_fees')
            .select('fee, neighborhood, estimated_time, min_order_value')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .ilike('neighborhood', `%${normalizedNeighborhood}%`)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            setDeliveryFeeData(data);
            setDeliveryFeeNotFound(false);
          } else {
            setDeliveryFeeData(null);
            setDeliveryFeeNotFound(true);
          }
        } catch (error) {
          console.error('Error fetching delivery fee:', error);
          setDeliveryFeeNotFound(true);
        } finally {
          setDeliveryFeeLoading(false);
        }
      };
      fetchDeliveryFee();
    }
  }, [step, customerInfo.neighborhood, orderType, restaurantId, deliveryFeeCheckedNeighborhoods]);

  // Format phone input
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const handlePhoneChange = (value: string) => {
    setPhoneInput(formatPhone(value));
  };

  // Search or create customer by phone
  const handleSearchCustomer = useCallback(async () => {
    const cleanPhone = phoneInput.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Informe um telefone válido');
      return;
    }

    setSearchingCustomer(true);
    try {
      // Use secure RPC function to lookup customer by phone
      const { data: existingCustomer, error: searchError } = await supabase
        .rpc('get_customer_by_phone', {
          _restaurant_id: restaurantId,
          _phone: cleanPhone,
        });

      if (searchError) throw searchError;

      // RPC returns an array, get first result
      const customer = Array.isArray(existingCustomer) ? existingCustomer[0] : existingCustomer;

      if (customer) {
        setCustomerId(customer.id);
        setIsNewCustomer(false);
        setCustomerInfo({
          name: customer.name || '',
          phone: cleanPhone,
          address: customer.address || '',
          number: customer.number || '',
          complement: customer.complement || '',
          neighborhood: customer.neighborhood || '',
          city: customer.city || '',
          cep: customer.cep || '',
        });
        toast.success(`Bem-vindo de volta, ${customer.name}!`);
        
        // Fetch saved addresses for existing customer
        await fetchSavedAddresses(customer.id);
      } else {
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

        setCustomerId(newCustomer.id);
        setIsNewCustomer(true);
        setCustomerInfo({
          name: '',
          phone: cleanPhone,
          address: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          cep: '',
        });
        setAddressMode('form'); // New customer goes straight to form
        toast.info('Complete seus dados para finalizar');
      }

      setStep('details');
    } catch (error) {
      console.error('Error searching customer:', error);
      toast.error('Erro ao buscar dados');
    } finally {
      setSearchingCustomer(false);
    }
  }, [phoneInput, restaurantId, fetchSavedAddresses]);

  // Update customer data before submitting
  const updateCustomerData = useCallback(async () => {
    if (!customerId) return;

    try {
      await supabase
        .from('customers')
        .update({
          name: customerInfo.name,
          address: customerInfo.address || null,
          number: customerInfo.number || null,
          complement: customerInfo.complement || null,
          neighborhood: customerInfo.neighborhood || null,
          city: customerInfo.city || null,
          cep: customerInfo.cep || null,
        })
        .eq('id', customerId);
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  }, [customerId, customerInfo]);

  // Format CEP with mask (00000-000)
  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  };

  const handleCepChange = async (cep: string) => {
    const cleanedCep = cep.replace(/\D/g, '');
    const formattedCep = formatCep(cep);
    setCustomerInfo((prev) => ({ ...prev, cep: formattedCep }));
    setCepError(false);

    if (cleanedCep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const data = await response.json();
        if (data.erro) {
          setCepError(true);
          toast.error('CEP não encontrado');
        } else {
          setCepError(false);
          setCustomerInfo((prev) => ({
            ...prev,
            cep: formattedCep,
            address: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
          }));
          // Trigger delivery fee lookup
          if (data.bairro) {
            handleNeighborhoodChange(data.bairro);
          }
        }
      } catch (error) {
        console.error('Error fetching CEP:', error);
        setCepError(true);
        toast.error('Erro ao buscar CEP');
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!customerInfo.name || !customerInfo.phone) return;
    if (orderType === 'delivery' && !customerInfo.address) return;
    
    // Validate change amount if needed
    if (paymentMethod === 'cash' && needsChange) {
      const changeAmount = parseFloat(changeFor.replace(/[^\d,]/g, '').replace(',', '.'));
      if (isNaN(changeAmount) || changeAmount < finalTotal) {
        toast.error('O valor para troco deve ser maior que o total do pedido');
        return;
      }
    }
    
    // Save or update address if in form mode and has address data
    if (addressMode === 'form' && orderType === 'delivery' && customerId && customerInfo.address && customerInfo.neighborhood) {
      await saveOrUpdateAddress();
    }
    
    const paymentInfo: PaymentInfo = {
      method: paymentMethod,
      needsChange: paymentMethod === 'cash' && needsChange,
      changeFor: paymentMethod === 'cash' && needsChange 
        ? parseFloat(changeFor.replace(/[^\d,]/g, '').replace(',', '.')) 
        : null,
    };
    
    await updateCustomerData();
    onSubmit(orderType, customerInfo, customerId, calculatedDeliveryFee, orderNotes, paymentInfo);
  };

  // Save or update address using secure RPC function
  const saveOrUpdateAddress = useCallback(async () => {
    if (!customerId || !customerInfo.address || !customerInfo.neighborhood) return;

    try {
      const { error } = await supabase.rpc('upsert_customer_address', {
        _restaurant_id: restaurantId,
        _customer_id: customerId,
        _address_id: editingAddressId || null,
        _label: addressLabel || 'Casa',
        _address: customerInfo.address,
        _number: customerInfo.number || null,
        _complement: customerInfo.complement || null,
        _neighborhood: customerInfo.neighborhood,
        _city: customerInfo.city,
        _state: null,
        _cep: customerInfo.cep || null,
        _is_default: savedAddresses.length === 0,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving address:', error);
    }
  }, [customerId, restaurantId, customerInfo, addressLabel, savedAddresses.length, editingAddressId]);

  // Handle select saved address
  const handleSelectAddress = useCallback((addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    applyAddressToForm(addr);
  }, [applyAddressToForm]);

  // Handle delete address using secure RPC function
  const handleDeleteAddress = useCallback(async (addressId: string) => {
    if (!customerId) return;

    try {
      const { error } = await supabase.rpc('delete_customer_address', {
        _restaurant_id: restaurantId,
        _customer_id: customerId,
        _address_id: addressId,
      });

      if (error) throw error;

      setSavedAddresses((prev) => prev.filter((a) => a.id !== addressId));
      
      if (selectedAddressId === addressId) {
        setSelectedAddressId(null);
        setCustomerInfo((prev) => ({
          ...prev,
          address: '',
          number: '',
          complement: '',
          neighborhood: '',
          city: '',
          cep: '',
        }));
        setDeliveryFeeData(null);
      }

      toast.success('Endereço excluído');
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Erro ao excluir endereço');
    }
  }, [selectedAddressId, customerId, restaurantId]);

  // Handle set default address using secure RPC function
  const handleSetDefaultAddress = useCallback(async (addressId: string) => {
    if (!customerId) return;

    try {
      const { error } = await supabase.rpc('set_default_customer_address', {
        _restaurant_id: restaurantId,
        _customer_id: customerId,
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
      console.error('Error setting default address:', error);
      toast.error('Erro ao definir endereço padrão');
    }
  }, [customerId, restaurantId]);

  // Handle add new address mode
  const handleAddNewAddress = useCallback(() => {
    setAddressMode('form');
    setSelectedAddressId(null);
    setEditingAddressId(null);
    setAddressLabel('Casa');
    setCustomerInfo((prev) => ({
      ...prev,
      address: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      cep: '',
    }));
    setDeliveryFeeData(null);
    setDeliveryFeeNotFound(false);
  }, []);

  // Handle edit address
  const handleEditAddress = useCallback((addr: SavedAddress) => {
    setEditingAddressId(addr.id);
    setAddressMode('form');
    setAddressLabel(addr.label);
    setCustomerInfo((prev) => ({
      ...prev,
      address: addr.address,
      number: addr.number || '',
      complement: addr.complement || '',
      neighborhood: addr.neighborhood,
      city: addr.city,
      cep: addr.cep || '',
    }));
    // Trigger delivery fee lookup
    if (addr.neighborhood) {
      handleNeighborhoodChangeDirect(addr.neighborhood);
    }
  }, [handleNeighborhoodChangeDirect]);

  // Search for delivery fee when neighborhood changes
  const handleNeighborhoodChange = useCallback(async (neighborhood: string) => {
    setCustomerInfo((prev) => ({ ...prev, neighborhood }));
    
    if (!neighborhood.trim() || orderType !== 'delivery') {
      setDeliveryFeeData(null);
      setDeliveryFeeNotFound(false);
      return;
    }

    setDeliveryFeeLoading(true);
    try {
      const normalizedNeighborhood = neighborhood.toLowerCase().trim();
      
      const { data, error } = await supabase
        .from('delivery_fees')
        .select('fee, neighborhood, estimated_time, min_order_value')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .ilike('neighborhood', `%${normalizedNeighborhood}%`)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setDeliveryFeeData(data);
        setDeliveryFeeNotFound(false);
      } else {
        setDeliveryFeeData(null);
        setDeliveryFeeNotFound(true);
      }
    } catch (error) {
      console.error('Error fetching delivery fee:', error);
      setDeliveryFeeNotFound(true);
    } finally {
      setDeliveryFeeLoading(false);
    }
  }, [restaurantId, orderType]);

  const isValid =
    customerInfo.name &&
    customerInfo.phone &&
    (orderType === 'takeaway' || (orderType === 'delivery' && customerInfo.address));

  const isBelowMinOrder = total < minOrderValue;
  const isClosed = !openStatus.isOpen;
  const canSubmit = isValid && !isBelowMinOrder && !isClosed;

  const finalTotal = orderType === 'delivery' ? total + calculatedDeliveryFee : total;
  const canSearchPhone = phoneInput.replace(/\D/g, '').length >= 10;

  // REMOVED: Custom scroll handling - let browser handle keyboard behavior naturally
  // This prevents the "jumping" issue on iOS when keyboard opens

  return (
    <Drawer open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DrawerContent className="max-h-[90dvh] flex flex-col overflow-hidden">
        <div className="mx-auto w-full max-w-lg flex flex-col flex-1 min-h-0 overflow-hidden">
          <DrawerHeader className="pb-2 flex-shrink-0 border-b border-border/50">
            <div className="flex items-center gap-2">
              {step === 'details' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -ml-2"
                  onClick={() => setStep('phone')}
                  disabled={loading}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <DrawerTitle className="text-base font-semibold">
                {step === 'phone' ? 'Identificação' : 'Finalizar Pedido'}
              </DrawerTitle>
            </div>
          </DrawerHeader>

          <div className="px-4 pb-8 overflow-y-auto flex-1 min-h-0 overscroll-contain -webkit-overflow-scrolling-touch">
            {/* Step 1: Phone identification */}
            {step === 'phone' && (
              <div className="space-y-6 py-4">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Phone className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base">Informe seu WhatsApp</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Para enviar o pedido e salvar seus dados
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Input
                    placeholder="(00) 00000-0000"
                    value={phoneInput}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="h-14 text-center text-xl rounded-xl"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    onKeyDown={(e) => e.key === 'Enter' && canSearchPhone && handleSearchCustomer()}
                  />
                  
                  <Button
                    size="lg"
                    className="w-full h-14 gap-2 text-base"
                    onClick={handleSearchCustomer}
                    disabled={!canSearchPhone || searchingCustomer}
                  >
                    {searchingCustomer ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Continuar
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground pb-4">
                    Se já pediu antes, seus dados serão preenchidos automaticamente
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Order details */}
            {step === 'details' && (
              <div className="space-y-5">
                {/* Customer found indicator */}
                {!isNewCustomer && customerId && (
                  <Alert className="bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-700 dark:text-green-400 text-xs">
                      Dados carregados do seu último pedido
                    </AlertDescription>
                  </Alert>
                )}

                {/* Closed Warning */}
                {isClosed && (
                  <Alert variant="destructive">
                    <Clock className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Estamos fechados. {openStatus.message}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Minimum Order Warning */}
                {isBelowMinOrder && !isClosed && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Pedido mínimo: {formatCurrency(minOrderValue)}. 
                      Adicione mais {formatCurrency(minOrderValue - total)}.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Order Type */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium">Tipo de pedido</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {deliveryEnabled && (
                      <button
                        type="button"
                        onClick={() => setOrderType('delivery')}
                        className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${
                          orderType === 'delivery'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border active:bg-muted'
                        }`}
                      >
                        <Bike className="w-6 h-6 text-primary mb-1" />
                        <span className="font-medium text-sm">Delivery</span>
                        {calculatedDeliveryFee > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{formatCurrency(calculatedDeliveryFee)}
                          </span>
                        )}
                      </button>
                    )}

                    {pickupEnabled && (
                      <button
                        type="button"
                        onClick={() => setOrderType('takeaway')}
                        className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${
                          orderType === 'takeaway'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'border-border active:bg-muted'
                        }`}
                      >
                        <Package className="w-6 h-6 text-amber-500 mb-1" />
                        <span className="font-medium text-sm">Retirar</span>
                        <span className="text-[10px] text-muted-foreground">no local</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    Seus dados
                  </Label>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="name" className="text-xs text-muted-foreground">Nome *</Label>
                      <Input
                        id="name"
                        placeholder="Seu nome"
                        value={customerInfo.name}
                        onChange={(e) =>
                          setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="h-11 mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone" className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        WhatsApp
                      </Label>
                      <Input
                        id="phone"
                        value={formatPhone(customerInfo.phone)}
                        disabled
                        className="h-11 mt-1 bg-muted"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                {orderType === 'delivery' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        Endereço de entrega
                      </Label>
                      {savedAddresses.length > 0 && addressMode === 'form' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => {
                            setAddressMode('list');
                            setEditingAddressId(null);
                          }}
                        >
                          <Home className="w-3 h-3 mr-1" />
                          Endereços salvos
                        </Button>
                      )}
                    </div>

                    {/* Saved addresses list */}
                    {addressMode === 'list' && savedAddresses.length > 0 && (
                      <SavedAddressesList
                        addresses={savedAddresses}
                        selectedAddressId={selectedAddressId}
                        onSelect={handleSelectAddress}
                        onAddNew={handleAddNewAddress}
                        onEdit={handleEditAddress}
                        onDelete={handleDeleteAddress}
                        onSetDefault={handleSetDefaultAddress}
                        loading={loadingAddresses}
                      />
                    )}

                    {/* Address form */}
                    {(addressMode === 'form' || savedAddresses.length === 0) && (
                      <div className="space-y-3">
                        {/* Editing indicator */}
                        {editingAddressId && (
                          <p className="text-xs text-primary font-medium">
                            ✏️ Editando endereço
                          </p>
                        )}

                        {/* Label for new/edit address */}
                        {(savedAddresses.length > 0 || editingAddressId) && (
                          <div>
                            <Label htmlFor="addressLabel" className="text-xs text-muted-foreground">
                              Nome do endereço
                            </Label>
                            <Input
                              id="addressLabel"
                              placeholder="Ex: Casa, Trabalho..."
                              value={addressLabel}
                              onChange={(e) => setAddressLabel(e.target.value)}
                              className="h-11 mt-1"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="cep" className="text-xs text-muted-foreground">CEP</Label>
                            <div className="relative mt-1">
                              <Input
                                id="cep"
                                placeholder="00000-000"
                                value={customerInfo.cep}
                                onChange={(e) => handleCepChange(e.target.value)}
                                maxLength={9}
                                inputMode="numeric"
                                className={`h-11 ${cepError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                              />
                              {cepLoading && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                              )}
                              {cepError && !cepLoading && (
                                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />
                              )}
                            </div>
                            {cepError && (
                              <p className="text-[10px] text-destructive mt-1">CEP não encontrado</p>
                            )}
                          </div>

                          <div>
                            <Label htmlFor="neighborhood" className="text-xs text-muted-foreground">Bairro</Label>
                            <div className="relative mt-1">
                              <Input
                                id="neighborhood"
                                placeholder="Bairro"
                                value={customerInfo.neighborhood}
                                onChange={(e) => handleNeighborhoodChange(e.target.value)}
                                className="h-11"
                              />
                              {deliveryFeeLoading && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="address" className="text-xs text-muted-foreground">Rua/Avenida *</Label>
                          <Input
                            id="address"
                            placeholder="Nome da rua"
                            value={customerInfo.address}
                            onChange={(e) =>
                              setCustomerInfo((prev) => ({ ...prev, address: e.target.value }))
                            }
                            className="h-11 mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="number" className="text-xs text-muted-foreground">Número</Label>
                            <Input
                              id="number"
                              placeholder="123"
                              value={customerInfo.number}
                              onChange={(e) =>
                                setCustomerInfo((prev) => ({ ...prev, number: e.target.value }))
                              }
                              className="h-11 mt-1"
                              inputMode="numeric"
                            />
                          </div>

                          <div>
                            <Label htmlFor="complement" className="text-xs text-muted-foreground">Complemento</Label>
                            <Input
                              id="complement"
                              placeholder="Apt, Bloco..."
                              value={customerInfo.complement}
                              onChange={(e) =>
                                setCustomerInfo((prev) => ({ ...prev, complement: e.target.value }))
                              }
                              className="h-11 mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="city" className="text-xs text-muted-foreground">Cidade</Label>
                          <Input
                            id="city"
                            placeholder="Cidade"
                            value={customerInfo.city}
                            onChange={(e) =>
                              setCustomerInfo((prev) => ({ ...prev, city: e.target.value }))
                            }
                            className="h-11 mt-1"
                          />
                        </div>

                        {savedAddresses.length > 0 && (
                          <p className="text-[10px] text-muted-foreground text-center">
                            Este endereço será salvo automaticamente
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery Fee Info */}
                {orderType === 'delivery' && (
                  <div className="space-y-2">
                    {deliveryFeeData && !deliveryFeeLoading && (
                      <Alert className="bg-primary/5 border-primary/20">
                        <Truck className="h-4 w-4 text-primary" />
                        <AlertDescription className="text-foreground text-xs">
                          <div className="flex justify-between items-center">
                            <span>Taxa de entrega ({deliveryFeeData.neighborhood})</span>
                            <span className="font-semibold">{formatCurrency(deliveryFeeData.fee)}</span>
                          </div>
                          {deliveryFeeData.estimated_time && (
                            <span className="text-muted-foreground block mt-0.5">
                              Tempo estimado: {deliveryFeeData.estimated_time} min
                            </span>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {deliveryFeeNotFound && !deliveryFeeLoading && customerInfo.neighborhood && (
                      <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                        <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs break-words">
                          Taxa para "{customerInfo.neighborhood}" será informada via WhatsApp
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Wallet className="w-4 h-4" />
                    Forma de pagamento
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('pix');
                        setNeedsChange(false);
                        setChangeFor('');
                      }}
                      className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${
                        paymentMethod === 'pix'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border active:bg-muted'
                      }`}
                    >
                      <QrCode className="w-5 h-5 text-emerald-500 mb-1" />
                      <span className="font-medium text-sm">PIX</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('cash');
                      }}
                      className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${
                        paymentMethod === 'cash'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border active:bg-muted'
                      }`}
                    >
                      <Banknote className="w-5 h-5 text-green-600 mb-1" />
                      <span className="font-medium text-sm">Dinheiro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('credit');
                        setNeedsChange(false);
                        setChangeFor('');
                      }}
                      className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${
                        paymentMethod === 'credit'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border active:bg-muted'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-blue-500 mb-1" />
                      <span className="font-medium text-sm">Crédito</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod('debit');
                        setNeedsChange(false);
                        setChangeFor('');
                      }}
                      className={`flex flex-col items-center justify-center p-3 border rounded-xl transition-all ${
                        paymentMethod === 'debit'
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border active:bg-muted'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-violet-500 mb-1" />
                      <span className="font-medium text-sm">Débito</span>
                    </button>
                  </div>

                  {/* Cash change options */}
                  {paymentMethod === 'cash' && (
                    <div className="space-y-3 pt-2 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setNeedsChange(false);
                            setChangeFor('');
                          }}
                          className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                            !needsChange
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          Sem troco
                        </button>
                        <button
                          type="button"
                          onClick={() => setNeedsChange(true)}
                          className={`flex-1 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                            needsChange
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          Preciso de troco
                        </button>
                      </div>

                      {needsChange && (
                        <div className="animate-in slide-in-from-top-2 duration-200">
                          <Label htmlFor="changeFor" className="text-xs text-muted-foreground">
                            Troco para quanto?
                          </Label>
                          <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              R$
                            </span>
                            <Input
                              id="changeFor"
                              placeholder="100,00"
                              value={changeFor}
                              onChange={(e) => {
                                // Allow only numbers and comma
                                const value = e.target.value.replace(/[^\d,]/g, '');
                                setChangeFor(value);
                              }}
                              className="h-11 pl-10 text-lg font-semibold"
                              inputMode="decimal"
                            />
                          </div>
                          {changeFor && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Troco: {formatCurrency(
                                Math.max(0, parseFloat(changeFor.replace(',', '.') || '0') - finalTotal)
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Order Notes */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4" />
                    Observações do pedido
                  </Label>
                  <Textarea
                    placeholder="Ex: Entregar no portão, chamar no interfone, etc..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="resize-none text-sm min-h-[60px]"
                    rows={2}
                  />
                </div>

                {/* Total */}
                <div className="border-t pt-4 space-y-2">
                  {orderType === 'delivery' && calculatedDeliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Taxa de entrega</span>
                      <span>{formatCurrency(calculatedDeliveryFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(finalTotal)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2 pb-6 space-y-3">
                  <Button
                    size="lg"
                    className="w-full h-14 gap-2 text-base"
                    onClick={handleSubmit}
                    disabled={!canSubmit || loading}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : isClosed ? (
                      <>
                        <Clock className="w-5 h-5" />
                        Estamos Fechados
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-5 h-5" />
                        Enviar via WhatsApp
                      </>
                    )}
                  </Button>
                  
                  {!isClosed && (
                    <p className="text-xs text-center text-muted-foreground">
                      O pedido será enviado para o WhatsApp do restaurante
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
