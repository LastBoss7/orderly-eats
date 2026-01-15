import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { 
  Printer, 
  Users, 
  CreditCard, 
  Banknote, 
  QrCode,
  Calculator,
  Loader2,
  Check,
  Receipt,
  Divide,
  X,
  ChevronRight,
  Minus,
  Plus,
  Percent,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  notes: string | null;
}

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  order_items?: OrderItem[];
}

interface Table {
  id: string;
  number: number;
  status: string;
}

interface CloseTableModalProps {
  open: boolean;
  onClose: () => void;
  table: Table | null;
  orders: Order[];
  onTableClosed: () => void;
}

interface SelectedItem {
  itemId: string;
  orderId: string;
  quantity: number;
  maxQuantity: number;
  name: string;
  price: number;
}

type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix' | 'mixed';
type SplitMode = 'none' | 'equal' | 'by-item';

export function CloseTableModal({ 
  open, 
  onClose, 
  table, 
  orders, 
  onTableClosed 
}: CloseTableModalProps) {
  const { restaurant } = useAuth();
  
  // States
  const [splitMode, setSplitMode] = useState<SplitMode>('none');
  const [numPeople, setNumPeople] = useState(2);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [printingReceipt, setPrintingReceipt] = useState(false);
  const [step, setStep] = useState<'summary' | 'split' | 'payment'>('summary');
  const [includeServiceCharge, setIncludeServiceCharge] = useState(false);
  
  // Service charge rate (10%)
  const SERVICE_CHARGE_RATE = 0.10;

  // All items from all orders
  const allItems = orders.flatMap(order => 
    (order.order_items || []).map(item => ({
      ...item,
      orderId: order.id,
    }))
  );

  // Calculate totals
  const subtotal = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const serviceCharge = includeServiceCharge ? subtotal * SERVICE_CHARGE_RATE : 0;
  const grandTotal = subtotal + serviceCharge;
  
  const selectedTotal = splitMode === 'by-item'
    ? selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    : grandTotal;

  const perPersonAmount = splitMode === 'equal' && numPeople > 0
    ? grandTotal / numPeople
    : 0;

  const amountToPay = splitMode === 'equal' ? perPersonAmount : selectedTotal;

  const change = paymentMethod === 'cash' && cashReceived > amountToPay
    ? cashReceived - amountToPay
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Reset states when modal opens
  useEffect(() => {
    if (open) {
      setSplitMode('none');
      setNumPeople(2);
      setSelectedItems([]);
      setPaymentMethod('pix');
      setCashReceived(0);
      setStep('summary');
      setIncludeServiceCharge(false);
    }
  }, [open]);

  const toggleItemSelection = (item: typeof allItems[0]) => {
    const existing = selectedItems.find(si => si.itemId === item.id);
    
    if (existing) {
      setSelectedItems(prev => prev.filter(si => si.itemId !== item.id));
    } else {
      setSelectedItems(prev => [...prev, {
        itemId: item.id,
        orderId: item.orderId,
        quantity: item.quantity,
        maxQuantity: item.quantity,
        name: item.product_name,
        price: item.product_price,
      }]);
    }
  };

  const updateItemQuantity = (itemId: string, newQuantity: number) => {
    setSelectedItems(prev => prev.map(item => 
      item.itemId === itemId 
        ? { ...item, quantity: Math.min(Math.max(1, newQuantity), item.maxQuantity) }
        : item
    ));
  };

  const handlePrintReceipt = async () => {
    setPrintingReceipt(true);
    
    try {
      const receiptContent = generateReceiptHTML();
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (printWindow) {
        printWindow.document.write(receiptContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
      
      toast.success('Conferência enviada para impressão!');
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('Erro ao imprimir conferência');
    } finally {
      setPrintingReceipt(false);
    }
  };

  const generateReceiptHTML = () => {
    const itemsToShow = splitMode === 'by-item' 
      ? selectedItems.map(si => ({
          name: si.name,
          quantity: si.quantity,
          price: si.price,
          total: si.price * si.quantity,
        }))
      : allItems.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.product_price,
          total: item.product_price * item.quantity,
        }));

    const totalToShow = splitMode === 'by-item' ? selectedTotal : grandTotal;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Conferência - Mesa ${table?.number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; padding: 10px; }
          .header { text-align: center; margin-bottom: 15px; }
          .header h1 { font-size: 16px; margin-bottom: 5px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .item-name { flex: 1; }
          .item-qty { width: 30px; text-align: center; }
          .item-price { width: 60px; text-align: right; }
          .total { font-weight: bold; font-size: 14px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; }
          ${splitMode === 'equal' ? `.split-info { margin-top: 10px; padding: 10px; border: 1px dashed #000; }` : ''}
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${restaurant?.name || 'Restaurante'}</h1>
          <p>CONFERÊNCIA DE CONTA</p>
          <p>Mesa ${table?.number}</p>
          <p>${formatDateTime(new Date().toISOString())}</p>
        </div>
        
        <div class="divider"></div>
        
        ${itemsToShow.map(item => `
          <div class="item">
            <span class="item-qty">${item.quantity}x</span>
            <span class="item-name">${item.name}</span>
            <span class="item-price">${formatCurrency(item.total)}</span>
          </div>
        `).join('')}
        
        <div class="divider"></div>
        
        <div class="item total">
          <span>TOTAL</span>
          <span>${formatCurrency(totalToShow)}</span>
        </div>
        
        ${splitMode === 'equal' ? `
          <div class="split-info">
            <p>Divisão por ${numPeople} pessoas:</p>
            <p><strong>${formatCurrency(perPersonAmount)} / pessoa</strong></p>
          </div>
        ` : ''}
        
        ${paymentMethod === 'cash' && cashReceived > 0 ? `
          <div class="divider"></div>
          <div class="item">
            <span>Recebido:</span>
            <span>${formatCurrency(cashReceived)}</span>
          </div>
          <div class="item">
            <span>Troco:</span>
            <span>${formatCurrency(change)}</span>
          </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="item">
          <span>Forma de pagamento:</span>
          <span>${getPaymentMethodLabel(paymentMethod)}</span>
        </div>
        
        <div class="footer">
          <p>Obrigado pela preferência!</p>
        </div>
      </body>
      </html>
    `;
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const labels = {
      cash: 'Dinheiro',
      credit: 'Cartão Crédito',
      debit: 'Cartão Débito',
      pix: 'PIX',
      mixed: 'Múltiplos',
    };
    return labels[method];
  };

  const handleCloseTable = async () => {
    if (!table) return;
    
    setLoading(true);
    
    try {
      for (const order of orders) {
        await supabase
          .from('orders')
          .update({ 
            status: 'delivered',
            payment_method: paymentMethod,
            closed_at: new Date().toISOString(),
            cash_received: paymentMethod === 'cash' ? cashReceived : null,
            change_given: paymentMethod === 'cash' ? change : null,
            split_mode: splitMode,
            split_people: splitMode === 'equal' ? numPeople : null,
          })
          .eq('id', order.id);
      }
      
      await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', table.id);
      
      toast.success(`Mesa ${table.number} fechada com sucesso!`);
      onTableClosed();
      onClose();
    } catch (error: any) {
      console.error('Error closing table:', error);
      toast.error('Erro ao fechar mesa: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // If no orders, show empty state
  if (orders.length === 0) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Receipt className="w-5 h-5 text-primary" />
              Mesa {table?.number}
            </SheetTitle>
          </SheetHeader>
          <div className="py-12 text-center space-y-4 px-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Nenhum pedido em aberto</p>
              <p className="text-sm text-muted-foreground mt-1">
                Esta mesa não possui pedidos para fechar.
              </p>
            </div>
            <Button onClick={onClose} className="mt-4">
              Fechar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent shrink-0">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="block text-lg">Mesa {table?.number}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {orders.length} pedido{orders.length > 1 ? 's' : ''} • {allItems.length} {allItems.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Total Banner */}
        <div className="bg-primary/10 px-4 py-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Subtotal</span>
            <span className="text-lg font-semibold">{formatCurrency(subtotal)}</span>
          </div>
          {includeServiceCharge && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Percent className="w-3 h-3" />
                Taxa de Serviço (10%)
              </span>
              <span className="text-sm font-medium text-primary">{formatCurrency(serviceCharge)}</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-primary/20">
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className="text-2xl font-bold">{formatCurrency(grandTotal)}</span>
          </div>
          {splitMode === 'equal' && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">Por pessoa ({numPeople} pessoas)</span>
              <span className="text-lg font-semibold text-primary">{formatCurrency(perPersonAmount)}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Step Indicator */}
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setStep('summary')}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  step === 'summary' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                1. Resumo
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <button
                onClick={() => setStep('split')}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  step === 'split' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                2. Divisão
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <button
                onClick={() => setStep('payment')}
                className={`px-3 py-1.5 rounded-full transition-colors ${
                  step === 'payment' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                3. Pagamento
              </button>
            </div>

            {/* Step 1: Summary */}
            {step === 'summary' && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Itens Consumidos
                </h3>
                <div className="bg-card rounded-xl border divide-y">
                  {allItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity}x {formatCurrency(item.product_price)}
                        </p>
                      </div>
                      <span className="font-semibold text-sm">
                        {formatCurrency(item.product_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Service Charge Toggle */}
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                        <Percent className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Taxa de Serviço (10%)</p>
                        <p className="text-xs text-muted-foreground">
                          {includeServiceCharge 
                            ? `+ ${formatCurrency(serviceCharge)}` 
                            : 'Não incluída'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={includeServiceCharge}
                      onCheckedChange={setIncludeServiceCharge}
                    />
                  </div>
                </div>

                <Button 
                  className="w-full h-12 mt-4" 
                  onClick={() => setStep('split')}
                >
                  Continuar
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Split Mode */}
            {step === 'split' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Dividir Conta?
                </h3>
                
                {/* Split Mode Options */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                      splitMode === 'none' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSplitMode('none')}
                  >
                    <Calculator className="w-5 h-5" />
                    <span className="text-xs font-medium">Única</span>
                  </button>
                  <button
                    type="button"
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                      splitMode === 'equal' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSplitMode('equal')}
                  >
                    <Users className="w-5 h-5" />
                    <span className="text-xs font-medium">Igual</span>
                  </button>
                  <button
                    type="button"
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                      splitMode === 'by-item' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSplitMode('by-item')}
                  >
                    <Divide className="w-5 h-5" />
                    <span className="text-xs font-medium">Por Item</span>
                  </button>
                </div>

                {/* Equal Split: Number of People */}
                {splitMode === 'equal' && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-4 space-y-3 border border-blue-200 dark:border-blue-800">
                    <Label className="text-sm font-medium">Quantas pessoas?</Label>
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-full"
                        onClick={() => setNumPeople(Math.max(2, numPeople - 1))}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <div className="w-16 text-center">
                        <span className="text-4xl font-bold">{numPeople}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-full"
                        onClick={() => setNumPeople(numPeople + 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-center py-3 bg-white dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-0.5">Valor por pessoa</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(perPersonAmount)}
                      </p>
                    </div>
                  </div>
                )}

                {/* By Item Selection */}
                {splitMode === 'by-item' && (
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Selecione os itens para este pagamento:</Label>
                    <div className="border rounded-xl divide-y max-h-48 overflow-y-auto">
                      {allItems.map((item) => {
                        const isSelected = selectedItems.some(si => si.itemId === item.id);
                        const selectedItem = selectedItems.find(si => si.itemId === item.id);
                        
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 transition-colors cursor-pointer hover:bg-muted/50 ${
                              isSelected ? 'bg-primary/5' : ''
                            }`}
                            onClick={() => toggleItemSelection(item)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleItemSelection(item)}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.product_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item.product_price)} cada
                              </p>
                            </div>
                            {isSelected && selectedItem && (
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateItemQuantity(item.id, selectedItem.quantity - 1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-6 text-center text-sm font-medium">{selectedItem.quantity}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => updateItemQuantity(item.id, selectedItem.quantity + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                            {!isSelected && (
                              <span className="text-xs font-medium text-muted-foreground">
                                {item.quantity}x
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {selectedItems.length > 0 && (
                      <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <span className="font-medium text-sm">Subtotal</span>
                        <span className="text-lg font-bold text-primary">{formatCurrency(selectedTotal)}</span>
                      </div>
                    )}
                  </div>
                )}

                <Button 
                  className="w-full h-12 mt-4" 
                  onClick={() => setStep('payment')}
                  disabled={splitMode === 'by-item' && selectedItems.length === 0}
                >
                  Continuar para Pagamento
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 'payment' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Forma de Pagamento
                </h3>
                
                {/* Amount to Pay */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {splitMode === 'equal' ? 'Valor por pessoa' : splitMode === 'by-item' ? 'Valor dos itens selecionados' : 'Valor a pagar'}
                  </p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                    {formatCurrency(amountToPay)}
                  </p>
                </div>

                {/* Payment Methods */}
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: 'pix', icon: QrCode, label: 'PIX' },
                    { key: 'credit', icon: CreditCard, label: 'Crédito' },
                    { key: 'debit', icon: CreditCard, label: 'Débito' },
                    { key: 'cash', icon: Banknote, label: 'Dinheiro' },
                    { key: 'mixed', icon: Calculator, label: 'Misto' },
                  ].map(({ key, icon: Icon, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                        paymentMethod === key 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setPaymentMethod(key as PaymentMethod)}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium leading-tight">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Cash Change Calculator */}
                {paymentMethod === 'cash' && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 space-y-3 border border-amber-200 dark:border-amber-800">
                    <Label className="text-sm font-medium">Valor Recebido</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={cashReceived || ''}
                      onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                      className="text-lg h-12 font-semibold"
                    />
                    {cashReceived > 0 && (
                      <div className="flex justify-between items-center py-2 px-3 bg-white dark:bg-gray-800 rounded-lg">
                        <span className="text-sm text-muted-foreground">Troco:</span>
                        <span className={`text-xl font-bold ${change >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {formatCurrency(change)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions Footer */}
        <div className="p-4 border-t bg-background shrink-0 space-y-2">
          {step === 'payment' && (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 h-11"
                onClick={handlePrintReceipt}
                disabled={printingReceipt}
              >
                {printingReceipt ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4" />
                )}
                Imprimir Conferência
              </Button>
              <Button
                type="button"
                className="w-full gap-2 h-12 text-base font-semibold"
                onClick={handleCloseTable}
                disabled={loading || (paymentMethod === 'cash' && cashReceived < amountToPay && cashReceived > 0)}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Confirmar Pagamento
              </Button>
            </>
          )}
          
          {step !== 'payment' && step !== 'summary' && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setStep(step === 'split' ? 'summary' : 'split')}
            >
              Voltar
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
