import { CustomerInfo, OrderType, MenuSettings, formatCurrency, isRestaurantOpen } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useEffect, useCallback } from 'react';
import { Bike, Package, MapPin, User, Phone, Loader2, MessageCircle, AlertCircle, Clock, Search, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MenuCheckoutProps {
  open: boolean;
  onClose: () => void;
  total: number;
  deliveryFee: number;
  onSubmit: (orderType: OrderType, customerInfo: CustomerInfo, customerId: string | null) => void;
  loading: boolean;
  menuSettings: MenuSettings;
  restaurantId: string;
}

type CheckoutStep = 'phone' | 'details';

export function MenuCheckout({
  open,
  onClose,
  total,
  deliveryFee,
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
      // Search for existing customer
      const { data: existingCustomer, error: searchError } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (searchError) throw searchError;

      if (existingCustomer) {
        // Found existing customer - fill in their data
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
        // New customer - create with just phone
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            restaurant_id: restaurantId,
            phone: cleanPhone,
            name: 'Cliente', // Placeholder, will be updated
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
        toast.info('Complete seus dados para finalizar o pedido');
      }

      setStep('details');
    } catch (error) {
      console.error('Error searching customer:', error);
      toast.error('Erro ao buscar dados. Tente novamente.');
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
    
    // Update customer data
    await updateCustomerData();
    
    // Submit order with customer ID
    onSubmit(orderType, customerInfo, customerId);
  };

  const isValid =
    customerInfo.name &&
    customerInfo.phone &&
    (orderType === 'takeaway' || (orderType === 'delivery' && customerInfo.address));

  const isBelowMinOrder = total < minOrderValue;
  const isClosed = menuSettings.use_opening_hours && !openStatus.isOpen;
  const canSubmit = isValid && !isBelowMinOrder && !isClosed;

  const finalTotal = orderType === 'delivery' ? total + deliveryFee : total;

  const canSearchPhone = phoneInput.replace(/\D/g, '').length >= 10;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 'phone' ? 'Identificação' : 'Finalizar Pedido'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Phone identification */}
        {step === 'phone' && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Phone className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground">
                Informe seu WhatsApp para continuar
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone-search">Número do WhatsApp</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone-search"
                    placeholder="(00) 00000-0000"
                    value={phoneInput}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && canSearchPhone && handleSearchCustomer()}
                  />
                  <Button
                    onClick={handleSearchCustomer}
                    disabled={!canSearchPhone || searchingCustomer}
                    className="gap-2"
                  >
                    {searchingCustomer ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Continuar
                  </Button>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Se você já pediu antes, seus dados serão preenchidos automaticamente
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Order details */}
        {step === 'details' && (
          <div className="space-y-6 py-4">
            {/* Customer found indicator */}
            {!isNewCustomer && customerId && (
            <Alert className="bg-emerald-500/10 border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <AlertDescription className="text-emerald-600 dark:text-emerald-400">
                Dados carregados do seu último pedido
              </AlertDescription>
            </Alert>
            )}

            {/* Closed Warning */}
            {isClosed && (
              <Alert variant="destructive">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Estamos fechados no momento. {openStatus.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Minimum Order Warning */}
            {isBelowMinOrder && !isClosed && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Pedido mínimo: {formatCurrency(minOrderValue)}. 
                  Adicione mais {formatCurrency(minOrderValue - total)} ao seu pedido.
                </AlertDescription>
              </Alert>
            )}

            {/* Order Type */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Tipo de pedido</Label>
              <RadioGroup
                value={orderType}
                onValueChange={(v) => setOrderType(v as OrderType)}
                className="grid grid-cols-2 gap-3"
              >
                {deliveryEnabled && (
                  <Label
                    htmlFor="delivery"
                    className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all ${
                      orderType === 'delivery'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="delivery" id="delivery" className="sr-only" />
                    <Bike className="w-8 h-8 mb-2 text-primary" />
                    <span className="font-medium">Delivery</span>
                    {deliveryFee > 0 && (
                      <span className="text-xs text-muted-foreground mt-1">
                        +{formatCurrency(deliveryFee)}
                      </span>
                    )}
                  </Label>
                )}

                {pickupEnabled && (
                  <Label
                    htmlFor="takeaway"
                    className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all ${
                      orderType === 'takeaway'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <RadioGroupItem value="takeaway" id="takeaway" className="sr-only" />
                    <Package className="w-8 h-8 mb-2 text-amber-500" />
                    <span className="font-medium">Retirar</span>
                    <span className="text-xs text-muted-foreground mt-1">no local</span>
                  </Label>
                )}
              </RadioGroup>
            </div>

            {/* Customer Info */}
            <div className="space-y-4">
              <Label className="text-base font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Seus dados
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Seu nome"
                    value={customerInfo.name}
                    onChange={(e) =>
                      setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    value={formatPhone(customerInfo.phone)}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {orderType === 'delivery' && (
              <div className="space-y-4">
                <Label className="text-base font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Endereço de entrega
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <div className="relative">
                      <Input
                        id="cep"
                        placeholder="00000-000"
                        value={customerInfo.cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        maxLength={9}
                      />
                      {cepLoading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      placeholder="Bairro"
                      value={customerInfo.neighborhood}
                      onChange={(e) =>
                        setCustomerInfo((prev) => ({ ...prev, neighborhood: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="address">Rua/Avenida *</Label>
                    <Input
                      id="address"
                      placeholder="Nome da rua"
                      value={customerInfo.address}
                      onChange={(e) =>
                        setCustomerInfo((prev) => ({ ...prev, address: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      placeholder="123"
                      value={customerInfo.number}
                      onChange={(e) =>
                        setCustomerInfo((prev) => ({ ...prev, number: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      placeholder="Apt, Bloco..."
                      value={customerInfo.complement}
                      onChange={(e) =>
                        setCustomerInfo((prev) => ({ ...prev, complement: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      placeholder="Cidade"
                      value={customerInfo.city}
                      onChange={(e) =>
                        setCustomerInfo((prev) => ({ ...prev, city: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="border-t pt-4 space-y-2">
              {orderType === 'delivery' && deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de entrega</span>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(finalTotal)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer buttons */}
        {step === 'details' && (
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full gap-2"
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
                  Enviar Pedido via WhatsApp
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep('phone')}
              disabled={loading}
            >
              Usar outro número
            </Button>
            {!isClosed && (
              <p className="text-xs text-center text-muted-foreground">
                O pedido será enviado para o WhatsApp do restaurante
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
