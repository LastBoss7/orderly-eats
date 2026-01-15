import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
} from 'lucide-react';

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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [printingReceipt, setPrintingReceipt] = useState(false);

  // All items from all orders
  const allItems = orders.flatMap(order => 
    (order.order_items || []).map(item => ({
      ...item,
      orderId: order.id,
    }))
  );

  // Calculate totals
  const grandTotal = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  
  const selectedTotal = splitMode === 'by-item'
    ? selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    : grandTotal;

  const perPersonAmount = splitMode === 'equal' && numPeople > 0
    ? grandTotal / numPeople
    : 0;

  const change = paymentMethod === 'cash' && cashReceived > selectedTotal
    ? cashReceived - selectedTotal
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
      year: 'numeric',
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
      setPaymentMethod('cash');
      setCashReceived(0);
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
      // Generate receipt content
      const receiptContent = generateReceiptHTML();
      
      // Open print window
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
      // Update all orders to 'delivered' status with payment info
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
      
      // Update table status to 'available'
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
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Receipt className="w-5 h-5 text-primary" />
              Mesa {table?.number}
            </DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center space-y-4">
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
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 z-[60]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="block">Fechar Mesa {table?.number}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {orders.length} pedido{orders.length > 1 ? 's' : ''} • {allItems.length} {allItems.length === 1 ? 'item' : 'itens'}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-4">
            {/* Grand Total Card */}
            <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl p-5 border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total da Mesa</p>
                  <p className="text-3xl font-bold text-foreground tracking-tight">
                    {formatCurrency(grandTotal)}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Calculator className="w-7 h-7 text-primary" />
                </div>
              </div>
            </div>

            {/* Orders Summary */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Resumo dos Pedidos
              </h3>
              <div className="bg-card rounded-xl border divide-y">
                {orders.map((order, idx) => (
                  <div key={order.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">
                        Pedido #{idx + 1}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(order.created_at)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {order.order_items?.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="font-medium">
                            {formatCurrency(item.product_price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-3 pt-2 border-t">
                      <span className="font-medium">Subtotal</span>
                      <span className="font-semibold">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Split Mode Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Modo de Divisão
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    splitMode === 'none' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => setSplitMode('none')}
                >
                  <Calculator className="w-6 h-6" />
                  <span className="text-sm font-medium">Conta Única</span>
                </button>
                <button
                  type="button"
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    splitMode === 'equal' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => setSplitMode('equal')}
                >
                  <Users className="w-6 h-6" />
                  <span className="text-sm font-medium">Dividir Igual</span>
                </button>
                <button
                  type="button"
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    splitMode === 'by-item' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => setSplitMode('by-item')}
                >
                  <Divide className="w-6 h-6" />
                  <span className="text-sm font-medium">Por Item</span>
                </button>
              </div>
            </div>

            {/* Equal Split Options */}
            {splitMode === 'equal' && (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-5 space-y-4 border border-blue-200 dark:border-blue-800">
                <Label className="text-sm font-medium">Número de Pessoas</Label>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-xl"
                    onClick={() => setNumPeople(Math.max(2, numPeople - 1))}
                  >
                    -
                  </Button>
                  <div className="w-20 text-center">
                    <span className="text-4xl font-bold">{numPeople}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-xl"
                    onClick={() => setNumPeople(numPeople + 1)}
                  >
                    +
                  </Button>
                </div>
                <div className="text-center py-4 bg-white dark:bg-gray-800 rounded-xl">
                  <p className="text-sm text-muted-foreground mb-1">Valor por pessoa</p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(perPersonAmount)}
                  </p>
                </div>
              </div>
            )}

            {/* Item Selection */}
            {splitMode === 'by-item' && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Selecione os Itens
                </Label>
                <div className="border rounded-xl divide-y max-h-56 overflow-y-auto">
                  {allItems.map((item) => {
                    const isSelected = selectedItems.some(si => si.itemId === item.id);
                    const selectedItem = selectedItems.find(si => si.itemId === item.id);
                    
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-4 transition-colors cursor-pointer hover:bg-muted/50 ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => toggleItemSelection(item)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleItemSelection(item)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.product_price)} cada
                          </p>
                        </div>
                        {isSelected && selectedItem && (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(item.id, selectedItem.quantity - 1)}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center font-medium">{selectedItem.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(item.id, selectedItem.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        )}
                        {!isSelected && (
                          <span className="text-sm font-medium text-muted-foreground">
                            {item.quantity}x
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedItems.length > 0 && (
                  <div className="flex justify-between items-center p-4 bg-primary/5 rounded-xl border border-primary/20">
                    <span className="font-medium">Subtotal Selecionado</span>
                    <span className="text-xl font-bold text-primary">{formatCurrency(selectedTotal)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Forma de Pagamento
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { key: 'cash', icon: Banknote, label: 'Dinheiro' },
                  { key: 'credit', icon: CreditCard, label: 'Crédito' },
                  { key: 'debit', icon: CreditCard, label: 'Débito' },
                  { key: 'pix', icon: QrCode, label: 'PIX' },
                  { key: 'mixed', icon: Calculator, label: 'Múltiplos' },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                      paymentMethod === key 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                    onClick={() => setPaymentMethod(key as PaymentMethod)}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Change Calculator */}
            {paymentMethod === 'cash' && (
              <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-5 space-y-4 border border-green-200 dark:border-green-800">
                <Label className="text-sm font-medium">Valor Recebido</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  className="text-xl h-14 font-semibold"
                />
                {cashReceived > 0 && (
                  <div className="flex justify-between items-center py-3 px-4 bg-white dark:bg-gray-800 rounded-xl">
                    <span className="text-muted-foreground font-medium">Troco:</span>
                    <span className={`text-2xl font-bold ${change >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(change)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t bg-muted/30">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2 h-12"
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
            className="flex-1 gap-2 h-12 text-base font-semibold"
            onClick={handleCloseTable}
            disabled={loading || (splitMode === 'by-item' && selectedItems.length === 0)}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Fechar Mesa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
