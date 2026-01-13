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
      // Update all orders to 'delivered' status
      for (const order of orders) {
        await supabase
          .from('orders')
          .update({ status: 'delivered' })
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Fechar Mesa {table?.number}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Orders Summary */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Resumo dos Pedidos</h3>
              <div className="space-y-2 text-sm">
                {orders.map((order, idx) => (
                  <div key={order.id} className="flex justify-between">
                    <span className="text-muted-foreground">
                      Pedido #{idx + 1} ({formatDateTime(order.created_at)})
                    </span>
                    <span className="font-medium">{formatCurrency(order.total)}</span>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total Geral</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Split Mode Selection */}
            <div className="space-y-3">
              <Label className="font-semibold">Modo de Pagamento</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={splitMode === 'none' ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setSplitMode('none')}
                >
                  <Calculator className="w-5 h-5" />
                  <span className="text-xs">Conta Única</span>
                </Button>
                <Button
                  type="button"
                  variant={splitMode === 'equal' ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setSplitMode('equal')}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-xs">Dividir Igual</span>
                </Button>
                <Button
                  type="button"
                  variant={splitMode === 'by-item' ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setSplitMode('by-item')}
                >
                  <Divide className="w-5 h-5" />
                  <span className="text-xs">Por Item</span>
                </Button>
              </div>
            </div>

            {/* Equal Split Options */}
            {splitMode === 'equal' && (
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 space-y-3">
                <Label>Número de Pessoas</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNumPeople(Math.max(2, numPeople - 1))}
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    value={numPeople}
                    onChange={(e) => setNumPeople(Math.max(2, parseInt(e.target.value) || 2))}
                    className="w-20 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNumPeople(numPeople + 1)}
                  >
                    +
                  </Button>
                </div>
                <div className="text-center py-3 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-muted-foreground">Valor por pessoa</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(perPersonAmount)}
                  </p>
                </div>
              </div>
            )}

            {/* Item Selection */}
            {splitMode === 'by-item' && (
              <div className="space-y-3">
                <Label className="font-semibold">Selecione os Itens para Pagamento</Label>
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {allItems.map((item) => {
                    const isSelected = selectedItems.some(si => si.itemId === item.id);
                    const selectedItem = selectedItems.find(si => si.itemId === item.id);
                    
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 transition-colors ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleItemSelection(item)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(item.product_price)} cada
                          </p>
                        </div>
                        {isSelected && selectedItem && (
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateItemQuantity(item.id, selectedItem.quantity - 1)}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center">{selectedItem.quantity}</span>
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
                          <span className="text-sm text-muted-foreground">
                            {item.quantity}x
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedItems.length > 0 && (
                  <div className="text-right font-semibold">
                    Subtotal Selecionado: {formatCurrency(selectedTotal)}
                  </div>
                )}
              </div>
            )}

            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="font-semibold">Forma de Pagamento</Label>
              <div className="grid grid-cols-5 gap-2">
                <Button
                  type="button"
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setPaymentMethod('cash')}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-xs">Dinheiro</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'credit' ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setPaymentMethod('credit')}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs">Crédito</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'debit' ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setPaymentMethod('debit')}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs">Débito</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'pix' ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setPaymentMethod('pix')}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-xs">PIX</span>
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'mixed' ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => setPaymentMethod('mixed')}
                >
                  <Calculator className="w-5 h-5" />
                  <span className="text-xs">Múltiplos</span>
                </Button>
              </div>
            </div>

            {/* Cash Change Calculator */}
            {paymentMethod === 'cash' && (
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 space-y-3">
                <Label>Valor Recebido</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  className="text-lg"
                />
                {cashReceived > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Troco:</span>
                    <span className={`text-xl font-bold ${change >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(change)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2"
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
            className="flex-1 gap-2"
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
