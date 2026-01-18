import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Search, User, MapPin, Phone, Loader2 } from 'lucide-react';
import { Customer, DeliveryForm, OrderMode } from '../types';
import logoGamakoWhite from '@/assets/logo-gamako-white.png';

interface DeliveryViewProps {
  orderMode: OrderMode;
  deliveryForm: DeliveryForm;
  customers: Customer[];
  isSearchingCustomer: boolean;
  onBack: () => void;
  onFormChange: (form: DeliveryForm) => void;
  onSearchCustomer: (query: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  onProceed: () => void;
}

export function DeliveryView({
  orderMode,
  deliveryForm,
  customers,
  isSearchingCustomer,
  onBack,
  onFormChange,
  onSearchCustomer,
  onSelectCustomer,
  onProceed,
}: DeliveryViewProps) {
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  const handleSearchChange = (value: string) => {
    setCustomerSearchTerm(value);
    onSearchCustomer(value);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setCustomerSearchTerm('');
    onSelectCustomer(customer);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen bg-muted flex flex-col"
    >
      {/* Header */}
      <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-lg bg-primary-foreground/10 flex items-center justify-center">
            <img src={logoGamakoWhite} alt="" className="h-5 object-contain" />
          </div>
          <div>
            <h1 className="font-bold">
              {orderMode === 'delivery' ? 'Novo Delivery' : 'Para Levar'}
            </h1>
            <p className="text-xs text-primary-foreground/70">Dados do cliente</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-lg mx-auto">
          {/* Customer Search */}
          <div className="bg-card rounded-xl p-4 shadow-sm">
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Search className="w-4 h-4" />
              Buscar Cliente
            </Label>
            <div className="relative">
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={customerSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pr-10"
              />
              {isSearchingCustomer && (
                <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              )}
            </div>
            
            {customers.length > 0 && (
              <div className="mt-2 border rounded-lg divide-y">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full p-3 text-left hover:bg-muted transition-colors"
                  >
                    <p className="font-medium text-foreground">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-card rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados do Cliente
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Nome *</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={deliveryForm.customerName}
                  onChange={(e) => onFormChange({ ...deliveryForm, customerName: e.target.value })}
                />
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Telefone *</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={deliveryForm.customerPhone}
                  onChange={(e) => onFormChange({ ...deliveryForm, customerPhone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Address for delivery */}
          {orderMode === 'delivery' && (
            <div className="bg-card rounded-xl p-4 shadow-sm space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Endereço de Entrega
              </h3>
              
              <div className="space-y-3">
                <Input
                  placeholder="Endereço *"
                  value={deliveryForm.address}
                  onChange={(e) => onFormChange({ ...deliveryForm, address: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Número"
                    value={deliveryForm.number}
                    onChange={(e) => onFormChange({ ...deliveryForm, number: e.target.value })}
                  />
                  <Input
                    placeholder="Complemento"
                    value={deliveryForm.complement}
                    onChange={(e) => onFormChange({ ...deliveryForm, complement: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Bairro"
                  value={deliveryForm.neighborhood}
                  onChange={(e) => onFormChange({ ...deliveryForm, neighborhood: e.target.value })}
                />
                <div>
                  <Label className="text-sm text-muted-foreground">Taxa de Entrega</Label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={deliveryForm.deliveryFee || ''}
                    onChange={(e) => onFormChange({ ...deliveryForm, deliveryFee: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Submit */}
      <div className="p-4 bg-card border-t">
        <Button
          className="w-full h-14 text-lg"
          onClick={onProceed}
        >
          Continuar para Pedido
          <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
        </Button>
      </div>
    </motion.div>
  );
}
