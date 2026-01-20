import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Banknote, CreditCard, QrCode, Check, Loader2, Users, Plus, Trash2 } from 'lucide-react';
import { PaymentMethod, formatCurrency } from '../types';
import { cn } from '@/lib/utils';

export interface PaymentEntry {
  id: string;
  method: PaymentMethod;
  amount: number;
  cashReceived?: number;
}

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
  onConfirm: (payments?: PaymentEntry[], splitCount?: number) => void;
  onClose: () => void;
}

const paymentOptions = [
  { id: 'cash' as const, label: 'Dinheiro', icon: Banknote },
  { id: 'credit' as const, label: 'Crédito', icon: CreditCard },
  { id: 'debit' as const, label: 'Débito', icon: CreditCard },
  { id: 'pix' as const, label: 'PIX', icon: QrCode },
];

const getMethodLabel = (method: PaymentMethod) => {
  const option = paymentOptions.find(p => p.id === method);
  return option?.label || method;
};

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
  const [mode, setMode] = useState<'simple' | 'split' | 'mixed'>('simple');
  const [splitCount, setSplitCount] = useState(2);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [currentMethod, setCurrentMethod] = useState<PaymentMethod>('cash');
  const [currentAmount, setCurrentAmount] = useState('');
  const [currentCashReceived, setCurrentCashReceived] = useState('');

  const change = paymentMethod === 'cash' && cashReceived > total 
    ? cashReceived - total 
    : 0;

  const entityLabel = entityType === 'table' 
    ? `Mesa ${entityNumber}`
    : customerName || `Comanda #${entityNumber}`;

  const perPerson = splitCount > 0 ? total / splitCount : total;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = total - totalPaid;

  const handleAddPayment = () => {
    const amount = parseFloat(currentAmount) || 0;
    if (amount <= 0) return;

    const newPayment: PaymentEntry = {
      id: Date.now().toString(),
      method: currentMethod,
      amount,
      cashReceived: currentMethod === 'cash' ? parseFloat(currentCashReceived) || amount : undefined,
    };

    setPayments([...payments, newPayment]);
    setCurrentAmount('');
    setCurrentCashReceived('');
  };

  const handleRemovePayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
  };

  const handleConfirm = () => {
    if (mode === 'mixed') {
      onConfirm(payments, undefined);
    } else if (mode === 'split') {
      onConfirm(undefined, splitCount);
    } else {
      onConfirm();
    }
  };

  const canConfirmMixed = remaining <= 0.01 && payments.length > 0;
  const canConfirmSimple = paymentMethod !== 'cash' || cashReceived >= total;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
      <div className="bg-card w-full max-w-md rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-foreground">
            Fechar {entityType === 'table' ? 'Mesa' : 'Comanda'}
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="text-center py-2">
          <p className="text-3xl font-bold text-foreground">{formatCurrency(total)}</p>
          <p className="text-muted-foreground">{entityLabel}</p>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-3 gap-2">
          <button
            className={cn(
              'p-2 rounded-xl border-2 text-center transition-all text-sm font-medium',
              mode === 'simple' 
                ? 'border-primary bg-primary/10 text-foreground' 
                : 'border-border hover:border-primary/50 text-muted-foreground'
            )}
            onClick={() => setMode('simple')}
          >
            Simples
          </button>
          <button
            className={cn(
              'p-2 rounded-xl border-2 text-center transition-all text-sm font-medium flex items-center justify-center gap-1',
              mode === 'split' 
                ? 'border-primary bg-primary/10 text-foreground' 
                : 'border-border hover:border-primary/50 text-muted-foreground'
            )}
            onClick={() => setMode('split')}
          >
            <Users className="w-4 h-4" />
            Dividir
          </button>
          <button
            className={cn(
              'p-2 rounded-xl border-2 text-center transition-all text-sm font-medium',
              mode === 'mixed' 
                ? 'border-primary bg-primary/10 text-foreground' 
                : 'border-border hover:border-primary/50 text-muted-foreground'
            )}
            onClick={() => setMode('mixed')}
          >
            Misto
          </button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-4 pr-2">
            {/* Simple Payment Mode */}
            {mode === 'simple' && (
              <>
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
              </>
            )}

            {/* Split Payment Mode */}
            {mode === 'split' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Dividir entre quantas pessoas:</label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                      disabled={splitCount <= 2}
                    >
                      -
                    </Button>
                    <span className="text-2xl font-bold w-12 text-center">{splitCount}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSplitCount(splitCount + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="bg-muted rounded-xl p-4 text-center">
                  <p className="text-muted-foreground text-sm">Valor por pessoa</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(perPerson)}</p>
                </div>

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
              </div>
            )}

            {/* Mixed Payment Mode */}
            {mode === 'mixed' && (
              <div className="space-y-4">
                {/* Registered Payments */}
                {payments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Pagamentos registrados:</p>
                    {payments.map((payment) => (
                      <div 
                        key={payment.id} 
                        className="flex items-center justify-between bg-muted/50 rounded-xl p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{getMethodLabel(payment.method)}</span>
                          {payment.method === 'cash' && payment.cashReceived && payment.cashReceived > payment.amount && (
                            <span className="text-xs text-muted-foreground">
                              (Recebido: {formatCurrency(payment.cashReceived)})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemovePayment(payment.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Remaining Amount */}
                <div className={cn(
                  "rounded-xl p-3 text-center border",
                  remaining > 0.01 ? "bg-warning/10 border-warning/30" : "bg-primary/10 border-primary/30"
                )}>
                  <p className="text-sm text-muted-foreground">
                    {remaining > 0.01 ? 'Falta pagar' : 'Conta fechada'}
                  </p>
                  <p className={cn(
                    "text-xl font-bold",
                    remaining > 0.01 ? "text-warning" : "text-primary"
                  )}>
                    {formatCurrency(Math.max(0, remaining))}
                  </p>
                </div>

                {/* Add New Payment */}
                {remaining > 0.01 && (
                  <div className="space-y-3 border rounded-xl p-3">
                    <p className="text-sm font-medium">Adicionar pagamento:</p>
                    
                    <div className="grid grid-cols-4 gap-1">
                      {paymentOptions.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          className={cn(
                            'p-2 rounded-lg border flex flex-col items-center gap-1 transition-all text-xs',
                            currentMethod === id 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border hover:border-primary/50'
                          )}
                          onClick={() => setCurrentMethod(id)}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                        <Input
                          type="number"
                          value={currentAmount}
                          onChange={(e) => setCurrentAmount(e.target.value)}
                          className="pl-10 h-10"
                          placeholder={formatCurrency(remaining).replace('R$', '').trim()}
                        />
                      </div>

                      {currentMethod === 'cash' && (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">Recebido R$</span>
                          <Input
                            type="number"
                            value={currentCashReceived}
                            onChange={(e) => setCurrentCashReceived(e.target.value)}
                            className="pl-24 h-10"
                            placeholder="0,00"
                          />
                        </div>
                      )}
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={handleAddPayment}
                      disabled={!currentAmount || parseFloat(currentAmount) <= 0}
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Pagamento
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
        
        <Button 
          className="w-full h-14 text-lg"
          onClick={handleConfirm}
          disabled={isClosing || (mode === 'mixed' && !canConfirmMixed)}
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
