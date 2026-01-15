import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { 
  Printer, 
  Plus, 
  X, 
  User, 
  Clock,
  Banknote,
  CreditCard,
  QrCode,
  ChevronDown,
  Minus,
  Check,
  Loader2,
  UtensilsCrossed,
  MoreHorizontal,
} from 'lucide-react';

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  product_size?: string | null;
  quantity: number;
  notes?: string | null;
}

interface Order {
  id: string;
  status: string | null;
  total: number | null;
  created_at: string;
  updated_at: string;
  order_number: number | null;
  customer_name: string | null;
  order_items?: OrderItem[];
}

interface CheckoutScreenProps {
  type: 'table' | 'tab';
  entityId: string;
  entityNumber: number;
  customerName?: string | null;
  orders: Order[];
  onClose: () => void;
  onClosed: () => void;
}

type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';

export function CheckoutScreen({
  type,
  entityId,
  entityNumber,
  customerName,
  orders,
  onClose,
  onClosed,
}: CheckoutScreenProps) {
  const { restaurant } = useAuth();
  
  // States
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null);
  const [paidAmount, setPaidAmount] = useState(0);
  const [splitCount, setSplitCount] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [addition, setAddition] = useState(0);
  const [activeTab, setActiveTab] = useState<'discount' | 'addition'>('discount');
  const [loading, setLoading] = useState(false);
  const [printingReceipt, setPrintingReceipt] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectingItems, setSelectingItems] = useState(false);
  const [cashReceived, setCashReceived] = useState(0);

  // All items from all orders
  const allItems = orders.flatMap(order => 
    (order.order_items || []).map(item => ({
      ...item,
      orderId: order.id,
      orderNumber: order.order_number,
    }))
  );

  // Calculate totals
  const subtotal = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalWithModifiers = subtotal - discount + addition;
  const perPerson = splitCount > 0 ? totalWithModifiers / splitCount : totalWithModifiers;
  const remaining = totalWithModifiers - paidAmount;
  const change = selectedPayment === 'cash' && cashReceived > remaining ? cashReceived - remaining : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const orderTime = new Date(dateString);
    const diffMs = now.getTime() - orderTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      preparing: 'Preparando',
      ready: 'Pronto',
      served: 'Servido',
      delivered: 'Entregue',
    };
    return labels[status || ''] || status || 'Pendente';
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'ready':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'served':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'preparing':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const generateReceiptHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Conferência - ${type === 'table' ? 'Mesa' : 'Comanda'} ${entityNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 280px; padding: 10px; }
          .header { text-align: center; margin-bottom: 15px; }
          .header h1 { font-size: 16px; margin-bottom: 5px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { font-weight: bold; font-size: 14px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 15px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${restaurant?.name || 'Restaurante'}</h1>
          <p>CONFERÊNCIA DE CONTA</p>
          <p>${type === 'table' ? 'Mesa' : 'Comanda'} ${entityNumber}</p>
          ${customerName ? `<p>${customerName}</p>` : ''}
          <p>${new Date().toLocaleString('pt-BR')}</p>
        </div>
        <div class="divider"></div>
        ${allItems.map(item => `
          <div class="item">
            <span>${item.quantity}x ${item.product_name}</span>
            <span>${formatCurrency(item.product_price * item.quantity)}</span>
          </div>
        `).join('')}
        <div class="divider"></div>
        ${discount > 0 ? `<div class="item"><span>Desconto</span><span>-${formatCurrency(discount)}</span></div>` : ''}
        ${addition > 0 ? `<div class="item"><span>Acréscimo</span><span>+${formatCurrency(addition)}</span></div>` : ''}
        <div class="item total">
          <span>TOTAL</span>
          <span>${formatCurrency(totalWithModifiers)}</span>
        </div>
        ${splitCount > 1 ? `<div class="item"><span>Por pessoa (${splitCount})</span><span>${formatCurrency(perPerson)}</span></div>` : ''}
        <div class="footer">
          <p>Obrigado pela preferência!</p>
        </div>
      </body>
      </html>
    `;
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

  const handleCloseAccount = async () => {
    if (!selectedPayment) {
      toast.error('Selecione uma forma de pagamento');
      return;
    }

    setLoading(true);
    
    try {
      // Update all orders to 'delivered' status with payment info
      for (const order of orders) {
        await supabase
          .from('orders')
          .update({ 
            status: 'delivered',
            payment_method: selectedPayment,
            closed_at: new Date().toISOString(),
            cash_received: selectedPayment === 'cash' ? cashReceived : null,
            change_given: selectedPayment === 'cash' ? change : null,
            split_people: splitCount > 1 ? splitCount : null,
          })
          .eq('id', order.id);
      }
      
      // Update table/tab status to 'available'
      if (type === 'table') {
        await supabase
          .from('tables')
          .update({ status: 'available' })
          .eq('id', entityId);
      } else {
        await supabase
          .from('tabs')
          .update({ status: 'available', customer_name: null })
          .eq('id', entityId);
      }
      
      toast.success(`${type === 'table' ? 'Mesa' : 'Comanda'} ${entityNumber} fechada com sucesso!`);
      onClosed();
    } catch (error: any) {
      console.error('Error closing:', error);
      toast.error(`Erro ao fechar ${type === 'table' ? 'mesa' : 'comanda'}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    await supabase
      .from('orders')
      .update({ status: 'served' })
      .eq('id', orderId);
    toast.success('Pedido marcado como entregue');
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          {/* Entity Selector */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${
            type === 'table' 
              ? 'border-emerald-300 bg-emerald-50 text-emerald-700' 
              : 'border-violet-300 bg-violet-50 text-violet-700'
          }`}>
            <UtensilsCrossed className="w-4 h-4" />
            <span className="font-medium">
              {type === 'table' ? 'Mesa' : 'Comanda'} {entityNumber}
            </span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="border-sky-400 text-sky-600 hover:bg-sky-50"
            onClick={handlePrintReceipt}
            disabled={printingReceipt}
          >
            {printingReceipt ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Printer className="w-4 h-4 mr-2" />
            )}
            Imprimir conferência
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-sky-400 text-sky-600">
                Ações
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Transferir para outra mesa</DropdownMenuItem>
              <DropdownMenuItem>Cancelar pedido</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button className="bg-sky-500 hover:bg-sky-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Novo pedido
          </Button>

          <Button 
            variant="ghost" 
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-2" />
            Fechar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side - Orders */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50">
          {/* Customer Info */}
          <div className="p-4 border-b bg-card">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{customerName || 'Cliente não identificado'}</span>
            </div>
          </div>

          {/* Orders List */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {orders.map((order) => (
                <div 
                  key={order.id} 
                  className={`rounded-xl border-2 bg-card overflow-hidden ${
                    type === 'table' 
                      ? 'border-l-4 border-l-emerald-500' 
                      : 'border-l-4 border-l-violet-500'
                  }`}
                >
                  {/* Order Header */}
                  <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold">
                        Pedido #{order.order_number || order.id.slice(0, 4).toUpperCase()}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getStatusColor(order.status)}`}
                      >
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.status !== 'served' && order.status !== 'delivered' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs"
                          onClick={() => handleMarkDelivered(order.id)}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Entregar
                        </Button>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        <Clock className="w-3 h-3" />
                        {formatTime(order.created_at)}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>Editar pedido</DropdownMenuItem>
                          <DropdownMenuItem>Reimprimir</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Cancelar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-4 space-y-3">
                    {order.order_items?.map((item) => (
                      <div key={item.id} className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {selectingItems && (
                              <Checkbox 
                                checked={selectedItemIds.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedItemIds([...selectedItemIds, item.id]);
                                  } else {
                                    setSelectedItemIds(selectedItemIds.filter(id => id !== item.id));
                                  }
                                }}
                              />
                            )}
                            <span className="text-sky-600 font-medium">
                              {item.quantity}x {item.product_name}
                            </span>
                          </div>
                          {item.product_size && (
                            <div className="text-sm text-muted-foreground ml-4">
                              ESCOLHA UM TAMANHO
                              <div className="text-xs">- tamanho {item.product_size}</div>
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-xs text-muted-foreground ml-4">
                              Obs: {item.notes}
                            </div>
                          )}
                        </div>
                        <span className="font-medium text-right">
                          {formatCurrency(item.product_price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Order Total */}
                  <div className="px-4 py-3 border-t flex items-center justify-between bg-muted/30">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(order.total || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right Side - Payment */}
        <div className="w-96 border-l bg-card flex flex-col">
          {/* Discount/Addition Tabs */}
          <div className="border-b">
            <div className="flex">
              <button
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                  activeTab === 'discount' 
                    ? 'text-foreground border-b-2 border-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('discount')}
              >
                Desconto
              </button>
              <button
                className={`flex-1 py-3 text-center text-sm font-medium transition-colors ${
                  activeTab === 'addition' 
                    ? 'text-foreground border-b-2 border-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('addition')}
              >
                Acréscimo
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-auto">
            {/* Discount/Addition Input */}
            {activeTab === 'discount' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount || ''}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="flex-1"
                />
              </div>
            )}
            {activeTab === 'addition' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addition || ''}
                  onChange={(e) => setAddition(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="flex-1"
                />
              </div>
            )}

            {/* Totals */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Desconto</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              {addition > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>Acréscimo</span>
                  <span>+{formatCurrency(addition)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Valor total</span>
                <span>{formatCurrency(totalWithModifiers)}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="pt-4">
              <div className="text-sm font-medium mb-3 text-muted-foreground">
                Escolha a 1ª forma de pagamento:
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    selectedPayment === 'cash'
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-border bg-sky-500 text-white hover:bg-sky-600'
                  }`}
                  onClick={() => setSelectedPayment('cash')}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-sm font-medium">Dinheiro</span>
                </button>
                <button
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    selectedPayment === 'credit' || selectedPayment === 'debit'
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-border bg-sky-500 text-white hover:bg-sky-600'
                  }`}
                  onClick={() => setSelectedPayment('credit')}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-sm font-medium">Cartão</span>
                </button>
                <button
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    selectedPayment === 'pix'
                      ? 'border-sky-500 bg-sky-500 text-white'
                      : 'border-border bg-sky-500 text-white hover:bg-sky-600'
                  }`}
                  onClick={() => setSelectedPayment('pix')}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-sm font-medium">Pix</span>
                </button>
              </div>
            </div>

            {/* Cash received input */}
            {selectedPayment === 'cash' && (
              <div className="space-y-2 pt-4">
                <label className="text-sm text-muted-foreground">Valor recebido</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashReceived || ''}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                />
                {change > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span>Troco</span>
                    <span>{formatCurrency(change)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t space-y-3">
            {/* Remaining Amount */}
            <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-lg">
              <span className="font-medium">Falta</span>
              <span className="font-bold text-lg">{formatCurrency(remaining > 0 ? remaining : 0)}</span>
            </div>

            {/* Split by people */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dividir por:</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-8 text-center font-medium">{splitCount}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSplitCount(splitCount + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <span className="text-sm ml-2">{formatCurrency(perPerson)}</span>
              </div>
            </div>

            {/* Select items button */}
            <Button
              variant="outline"
              className="w-full border-sky-400 text-sky-600 hover:bg-sky-50"
              onClick={() => setSelectingItems(!selectingItems)}
            >
              {selectingItems ? <Check className="w-4 h-4 mr-2" /> : <MoreHorizontal className="w-4 h-4 mr-2" />}
              {selectingItems ? 'Confirmar seleção' : 'Selecionar itens para pagamento'}
            </Button>

            {/* Close Account Button */}
            <Button
              className="w-full h-12 bg-sky-500 hover:bg-sky-600 text-white font-medium text-base"
              onClick={handleCloseAccount}
              disabled={loading || !selectedPayment}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Fechar conta'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
