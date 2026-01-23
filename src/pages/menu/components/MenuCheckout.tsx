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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useEffect, useCallback } from 'react';
import { Bike, Package, MapPin, User, Phone, Loader2, MessageCircle, AlertCircle, Clock, ArrowRight, CheckCircle2, Info, Truck, ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeliveryFeeData {
  fee: number;
  neighborhood: string;
  estimated_time: string | null;
  min_order_value: number | null;
}

interface MenuCheckoutProps {
  open: boolean;
  onClose: () => void;
  total: number;
  onSubmit: (orderType: OrderType, customerInfo: CustomerInfo, customerId: string | null, deliveryFee: number) => void;
  loading: boolean;
  menuSettings: MenuSettings;
  restaurantId: string;
}

type CheckoutStep = 'phone' | 'details';

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
  const openStatus = isRestaurantOpen(menuSettings.opening_hours, menuSettings.use_opening_hours);

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

  // Delivery fee state
  const [deliveryFeeData, setDeliveryFeeData] = useState<DeliveryFeeData | null>(null);
  const [deliveryFeeLoading, setDeliveryFeeLoading] = useState(false);
  const [deliveryFeeNotFound, setDeliveryFeeNotFound] = useState(false);

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
    }
  }, [open]);

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
      const { data: existingCustomer, error: searchError } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (searchError) throw searchError;

      if (existingCustomer) {
        setCustomerId(existingCustomer.id);
        setIsNewCustomer(false);
        setCustomerInfo({
          name: existingCustomer.name || '',
          phone: cleanPhone,
          address: existingCustomer.address || '',
          number: existingCustomer.number || '',
          complement: existingCustomer.complement || '',
          neighborhood: existingCustomer.neighborhood || '',
          city: existingCustomer.city || '',
          cep: existingCustomer.cep || '',
        });
        toast.success(`Bem-vindo de volta, ${existingCustomer.name}!`);
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
        toast.info('Complete seus dados para finalizar');
      }

      setStep('details');
    } catch (error) {
      console.error('Error searching customer:', error);
      toast.error('Erro ao buscar dados');
    } finally {
      setSearchingCustomer(false);
    }
  }, [phoneInput, restaurantId]);

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

  const handleCepChange = async (cep: string) => {
    const cleanedCep = cep.replace(/\D/g, '');
    setCustomerInfo((prev) => ({ ...prev, cep: cleanedCep }));

    if (cleanedCep.length === 8) {
      setCepLoading(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setCustomerInfo((prev) => ({
            ...prev,
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
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!customerInfo.name || !customerInfo.phone) return;
    if (orderType === 'delivery' && !customerInfo.address) return;
    
    await updateCustomerData();
    onSubmit(orderType, customerInfo, customerId, calculatedDeliveryFee);
  };

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
  const isClosed = menuSettings.use_opening_hours && !openStatus.isOpen;
  const canSubmit = isValid && !isBelowMinOrder && !isClosed;

  const finalTotal = orderType === 'delivery' ? total + calculatedDeliveryFee : total;
  const canSearchPhone = phoneInput.replace(/\D/g, '').length >= 10;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader className="pb-2">
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
              <DrawerTitle className="text-base">
                {step === 'phone' ? 'Identificação' : 'Finalizar Pedido'}
              </DrawerTitle>
            </div>
          </DrawerHeader>

          <div className="px-4 pb-6 overflow-y-auto max-h-[70vh]">
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

                <div className="space-y-3">
                  <Input
                    placeholder="(00) 00000-0000"
                    value={phoneInput}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="h-12 text-center text-lg"
                    onKeyDown={(e) => e.key === 'Enter' && canSearchPhone && handleSearchCustomer()}
                  />
                  
                  <Button
                    size="lg"
                    className="w-full h-12 gap-2"
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

                  <p className="text-[11px] text-center text-muted-foreground">
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
                        className="h-10 mt-1"
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
                        className="h-10 mt-1 bg-muted"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                {orderType === 'delivery' && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      Endereço de entrega
                    </Label>

                    <div className="space-y-3">
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
                              className="h-10"
                            />
                            {cepLoading && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="neighborhood" className="text-xs text-muted-foreground">Bairro</Label>
                          <div className="relative mt-1">
                            <Input
                              id="neighborhood"
                              placeholder="Bairro"
                              value={customerInfo.neighborhood}
                              onChange={(e) => handleNeighborhoodChange(e.target.value)}
                              className="h-10"
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
                          className="h-10 mt-1"
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
                            className="h-10 mt-1"
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
                            className="h-10 mt-1"
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
                          className="h-10 mt-1"
                        />
                      </div>
                    </div>
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
                        <Info className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-700 dark:text-amber-400 text-xs">
                          Taxa para "{customerInfo.neighborhood}" será informada via WhatsApp
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

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
                <div className="pt-2 space-y-3">
                  <Button
                    size="lg"
                    className="w-full h-12 gap-2"
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
                    <p className="text-[10px] text-center text-muted-foreground">
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
