import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Search,
  User,
  MapPin,
} from 'lucide-react';
import { Customer, DeliveryForm } from '../types';

interface DeliveryViewRefactoredProps {
  orderMode: 'delivery' | 'takeaway';
  deliveryForm: DeliveryForm;
  customers: Customer[];
  onBack: () => void;
  onDeliveryFormChange: (form: DeliveryForm) => void;
  onSelectCustomer: (customer: Customer) => void;
  onSearchCustomers: (term: string) => void;
  onProceed: () => void;
}

export function DeliveryViewRefactored({
  orderMode,
  deliveryForm,
  customers,
  onBack,
  onDeliveryFormChange,
  onSelectCustomer,
  onSearchCustomers,
  onProceed,
}: DeliveryViewRefactoredProps) {
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      if (customerSearchTerm.length >= 3) {
        onSearchCustomers(customerSearchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customerSearchTerm, onSearchCustomers]);

  const updateForm = (field: keyof DeliveryForm, value: string | number) => {
    onDeliveryFormChange({ ...deliveryForm, [field]: value });
  };

  const canProceed = () => {
    if (!deliveryForm.customerName.trim()) return false;
    if (!deliveryForm.customerPhone.trim()) return false;
    if (orderMode === 'delivery' && !deliveryForm.address.trim()) return false;
    return true;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen bg-background flex flex-col"
    >
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
          <div>
            <h1 className="font-bold">
              {orderMode === 'delivery' ? 'Novo Pedido Delivery' : 'Pedido Para Levar'}
            </h1>
            <p className="text-xs text-primary-foreground/70">Dados do cliente</p>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Customer Search */}
          <div className="bg-card rounded-xl p-4 shadow-sm border">
            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Search className="w-4 h-4" />
              Buscar cliente existente
            </Label>
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={customerSearchTerm}
              onChange={(e) => setCustomerSearchTerm(e.target.value)}
              className="bg-muted/50"
            />
            
            {customers.length > 0 && (
              <div className="mt-2 border rounded-lg divide-y">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => {
                      onSelectCustomer(customer);
                      setCustomerSearchTerm('');
                    }}
                    className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="bg-card rounded-xl p-4 shadow-sm border space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Dados do Cliente
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Nome *</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={deliveryForm.customerName}
                  onChange={(e) => updateForm('customerName', e.target.value)}
                  className="mt-1 bg-muted/50"
                />
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Telefone *</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={deliveryForm.customerPhone}
                  onChange={(e) => updateForm('customerPhone', e.target.value)}
                  className="mt-1 bg-muted/50"
                />
              </div>
            </div>
          </div>

          {/* Address for delivery */}
          {orderMode === 'delivery' && (
            <div className="bg-card rounded-xl p-4 shadow-sm border space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Endereço de Entrega
              </h3>
              
              <div className="space-y-3">
                <Input
                  placeholder="Endereço *"
                  value={deliveryForm.address}
                  onChange={(e) => updateForm('address', e.target.value)}
                  className="bg-muted/50"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Número"
                    value={deliveryForm.number}
                    onChange={(e) => updateForm('number', e.target.value)}
                    className="bg-muted/50"
                  />
                  <Input
                    placeholder="Complemento"
                    value={deliveryForm.complement}
                    onChange={(e) => updateForm('complement', e.target.value)}
                    className="bg-muted/50"
                  />
                </div>
                <Input
                  placeholder="Bairro"
                  value={deliveryForm.neighborhood}
                  onChange={(e) => updateForm('neighborhood', e.target.value)}
                  className="bg-muted/50"
                />
                <div>
                  <Label className="text-sm text-muted-foreground">Taxa de Entrega</Label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={deliveryForm.deliveryFee || ''}
                    onChange={(e) => updateForm('deliveryFee', parseFloat(e.target.value) || 0)}
                    className="mt-1 bg-muted/50"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 bg-card border-t shadow-lg">
        <Button
          className="w-full h-14 text-base font-semibold"
          onClick={onProceed}
          disabled={!canProceed()}
        >
          Continuar para Pedido
          <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
        </Button>
      </div>
    </motion.div>
  );
}
