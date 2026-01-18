import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Banknote, CreditCard, QrCode, Check, Loader2 } from 'lucide-react';
import { PaymentMethod, formatCurrency } from '../types';
import { cn } from '@/lib/utils';

interface PaymentModalProps {
  entityType: 'table' | 'tab';
  entityNumber: number;
  customerName?: string | null;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  isClosing: boolean;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onCashReceivedChange: (amount: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const paymentOptions = [
  { id: 'cash' as const, label: 'Dinheiro', icon: Banknote },
  { id: 'credit' as const, label: 'Crédito', icon: CreditCard },
  { id: 'debit' as const, label: 'Débito', icon: CreditCard },
  { id: 'pix' as const, label: 'PIX', icon: QrCode },
];

export function PaymentModal({
  entityType,
  entityNumber,
  customerName,
  total,
  paymentMethod,
  cashReceived,
  isClosing,
  onPaymentMethodChange,
  onCashReceivedChange,
  onConfirm,
  onClose,
}: PaymentModalProps) {
  const change = paymentMethod === 'cash' && cashReceived > total 
    ? cashReceived - total 
    : 0;

  const entityLabel = entityType === 'table' 
    ? `Mesa ${entityNumber}`
    : customerName || `Comanda #${entityNumber}`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
      <div className="bg-card w-full max-w-md rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground">
            Fechar {entityType === 'table' ? 'Mesa' : 'Comanda'}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="text-center py-4">
          <p className="text-3xl font-bold text-foreground">{formatCurrency(total)}</p>
          <p className="text-muted-foreground">{entityLabel}</p>
        </div>
        
        {/* Payment Methods */}
        <div className="grid grid-cols-2 gap-2">
          {paymentOptions.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={cn(
                'p-3 rounded-xl border-2 flex items-center gap-2 transition-all',
                paymentMethod === id 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => onPaymentMethodChange(id)}
            >
              <Icon className="w-5 h-5 text-foreground" />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>
        
        {/* Cash Amount */}
        {paymentMethod === 'cash' && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Valor recebido:</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <Input
                type="number"
                value={cashReceived || ''}
                onChange={(e) => onCashReceivedChange(parseFloat(e.target.value) || 0)}
                className="pl-10 h-12 text-lg"
                placeholder="0,00"
              />
            </div>
            {change > 0 && (
              <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Troco: {formatCurrency(change)}
              </p>
            )}
          </div>
        )}
        
        <Button 
          className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700"
          onClick={onConfirm}
          disabled={isClosing}
        >
          {isClosing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              Confirmar Fechamento
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
