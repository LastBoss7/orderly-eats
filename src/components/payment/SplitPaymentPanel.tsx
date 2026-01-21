import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Banknote,
  CreditCard,
  QrCode,
  Users,
  Plus,
  Trash2,
  Check,
  Loader2,
  User,
  Clock,
  Wallet,
} from 'lucide-react';

export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';

export interface IndividualPayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  paidBy: string;
  cashReceived?: number;
  changeGiven?: number;
  createdAt: string;
}

interface SplitPaymentPanelProps {
  total: number;
  existingPayments?: IndividualPayment[];
  onPaymentAdded: (payment: Omit<IndividualPayment, 'id' | 'createdAt'>) => Promise<void>;
  onPaymentRemoved?: (paymentId: string) => Promise<void>;
  onCloseAccount: () => Promise<void>;
  isClosing?: boolean;
  entityLabel: string;
}

const paymentMethods = [
  { id: 'cash' as const, label: 'Dinheiro', icon: Banknote, color: 'text-emerald-600' },
  { id: 'credit' as const, label: 'Crédito', icon: CreditCard, color: 'text-blue-600' },
  { id: 'debit' as const, label: 'Débito', icon: CreditCard, color: 'text-purple-600' },
  { id: 'pix' as const, label: 'PIX', icon: QrCode, color: 'text-cyan-600' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function SplitPaymentPanel({
  total,
  existingPayments = [],
  onPaymentAdded,
  onPaymentRemoved,
  onCloseAccount,
  isClosing = false,
  entityLabel,
}: SplitPaymentPanelProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [showSplitHelper, setShowSplitHelper] = useState(false);

  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const perPerson = splitCount > 0 ? total / splitCount : total;
  
  const parsedAmount = parseFloat(amount) || 0;
  const parsedCashReceived = parseFloat(cashReceived) || 0;
  const change = selectedMethod === 'cash' && parsedCashReceived > parsedAmount 
    ? parsedCashReceived - parsedAmount 
    : 0;

  const canAddPayment = parsedAmount > 0 && parsedAmount <= remaining + 0.01;
  const isFullyPaid = remaining <= 0.01;

  const handleAddPayment = async () => {
    if (!canAddPayment) return;
    
    setIsAddingPayment(true);
    try {
      await onPaymentAdded({
        amount: parsedAmount,
        method: selectedMethod,
        paidBy: paidBy || `Pessoa ${existingPayments.length + 1}`,
        cashReceived: selectedMethod === 'cash' ? parsedCashReceived : undefined,
        changeGiven: selectedMethod === 'cash' ? change : undefined,
      });
      
      // Reset form
      setAmount('');
      setPaidBy('');
      setCashReceived('');
    } finally {
      setIsAddingPayment(false);
    }
  };

  const handleRemovePayment = async (paymentId: string) => {
    if (onPaymentRemoved) {
      await onPaymentRemoved(paymentId);
    }
  };

  const handleUsePerPerson = () => {
    setAmount(perPerson.toFixed(2));
    setShowSplitHelper(false);
  };

  const handleUseRemaining = () => {
    setAmount(remaining.toFixed(2));
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progresso do pagamento</span>
          <span className="font-medium">
            {formatCurrency(totalPaid)} / {formatCurrency(total)}
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              isFullyPaid ? "bg-emerald-500" : "bg-primary"
            )}
            style={{ width: `${Math.min(100, (totalPaid / total) * 100)}%` }}
          />
        </div>
      </div>

      {/* Remaining Amount Card */}
      <div className={cn(
        "rounded-xl p-4 border-2 transition-all",
        isFullyPaid 
          ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700" 
          : "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700"
      )}>
        <div className="flex items-center justify-between">
          <div>
            <p className={cn(
              "text-sm font-medium",
              isFullyPaid ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
            )}>
              {isFullyPaid ? 'Conta Fechada!' : 'Falta Pagar'}
            </p>
            <p className={cn(
              "text-3xl font-bold",
              isFullyPaid ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
            )}>
              {formatCurrency(remaining)}
            </p>
          </div>
          {isFullyPaid && (
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Existing Payments */}
      {existingPayments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4" />
            Pagamentos Registrados ({existingPayments.length})
          </h4>
          <ScrollArea className="max-h-48">
            <div className="space-y-2">
              {existingPayments.map((payment, index) => {
                const methodInfo = paymentMethods.find(m => m.id === payment.method);
                const Icon = methodInfo?.icon || Wallet;
                
                return (
                  <div 
                    key={payment.id}
                    className="flex items-center gap-3 p-3 bg-card rounded-xl border group hover:border-primary/30 transition-all"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center bg-muted",
                      methodInfo?.color
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {formatCurrency(payment.amount)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {methodInfo?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{payment.paidBy}</span>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(payment.createdAt)}</span>
                        {payment.changeGiven && payment.changeGiven > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600">Troco: {formatCurrency(payment.changeGiven)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {onPaymentRemoved && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
                        onClick={() => handleRemovePayment(payment.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Add Payment Form */}
      {!isFullyPaid && (
        <div className="space-y-4 p-4 bg-card rounded-xl border-2 border-dashed border-primary/30">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo Pagamento
            </h4>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setShowSplitHelper(!showSplitHelper)}
            >
              <Users className="w-3 h-3 mr-1" />
              Calculadora
            </Button>
          </div>

          {/* Split Helper */}
          {showSplitHelper && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Dividir entre:</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSplitCount(Math.max(2, splitCount - 1))}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center font-bold">{splitCount}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setSplitCount(splitCount + 1)}
                  >
                    +
                  </Button>
                  <span className="text-xs text-muted-foreground">pessoas</span>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleUsePerPerson}
              >
                Usar {formatCurrency(perPerson)} por pessoa
              </Button>
            </div>
          )}

          {/* Payment Method Selection */}
          <div className="grid grid-cols-4 gap-2">
            {paymentMethods.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                type="button"
                className={cn(
                  "p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all",
                  selectedMethod === id 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
                onClick={() => setSelectedMethod(id)}
              >
                <Icon className={cn("w-5 h-5", selectedMethod === id ? "text-primary" : color)} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Valor</Label>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={handleUseRemaining}
              >
                Usar restante ({formatCurrency(remaining)})
              </Button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 h-12 text-xl font-semibold"
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Paid By Input */}
          <div className="space-y-2">
            <Label className="text-sm">Quem está pagando?</Label>
            <Input
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="h-10"
              placeholder={`Pessoa ${existingPayments.length + 1}`}
            />
          </div>

          {/* Cash Received (only for cash) */}
          {selectedMethod === 'cash' && (
            <div className="space-y-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <Label className="text-sm text-emerald-700 dark:text-emerald-400">Valor Recebido</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-medium">R$</span>
                <Input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="pl-10 h-10 border-emerald-300 dark:border-emerald-700"
                  placeholder={amount || '0,00'}
                />
              </div>
              {change > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-emerald-200 dark:border-emerald-700">
                  <span className="text-sm text-emerald-700 dark:text-emerald-400">Troco:</span>
                  <span className="text-xl font-bold text-emerald-600">{formatCurrency(change)}</span>
                </div>
              )}
            </div>
          )}

          {/* Add Payment Button */}
          <Button
            className="w-full h-12 gap-2"
            onClick={handleAddPayment}
            disabled={!canAddPayment || isAddingPayment}
          >
            {isAddingPayment ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Registrar Pagamento de {parsedAmount > 0 ? formatCurrency(parsedAmount) : 'R$ 0,00'}
          </Button>
        </div>
      )}

      {/* Close Account Button */}
      {isFullyPaid && (
        <Button
          className="w-full h-14 gap-2 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700"
          onClick={onCloseAccount}
          disabled={isClosing}
        >
          {isClosing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
          Fechar {entityLabel}
        </Button>
      )}
    </div>
  );
}
