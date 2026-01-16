import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  Printer, 
  Receipt, 
  Clock,
  Users,
  Calculator,
  CreditCard,
  Banknote,
  QrCode,
  Loader2,
  Check,
  Divide,
  X,
  MoreVertical,
  RotateCcw,
} from 'lucide-react';
import { usePrintToElectron } from '@/hooks/usePrintToElectron';

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
  status: 'available' | 'occupied' | 'closing';
}

interface WaiterTableOrdersProps {
  table: Table;
  onBack: () => void;
  onTableClosed: () => void;
}

type PaymentMethod = 'cash' | 'credit' | 'debit' | 'pix';
type SplitMode = 'none' | 'equal';

export function WaiterTableOrders({ table, onBack, onTableClosed }: WaiterTableOrdersProps) {
  const { restaurant } = useAuth();
  const { printConference, reprintOrder } = usePrintToElectron();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCloseMode, setShowCloseMode] = useState(false);
  const [closing, setClosing] = useState(false);
  const [printing, setPrinting] = useState(false);
  
  // Order actions
  const [openOrderMenu, setOpenOrderMenu] = useState<string | null>(null);
  const [reprintingOrder, setReprintingOrder] = useState<string | null>(null);
  
  // Payment states
  const [splitMode, setSplitMode] = useState<SplitMode>('none');
  const [numPeople, setNumPeople] = useState(2);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState(0);

  // Close order menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openOrderMenu) {
        setOpenOrderMenu(null);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openOrderMenu]);

  const fetchOrders = useCallback(async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .eq('table_id', table.id)
        .in('status', ['pending', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id, table.id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime subscription
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel(`waiter-table-${table.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `table_id=eq.${table.id}`,
        },
        () => fetchOrders()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
        },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, table.id, fetchOrders]);

  const allItems = orders.flatMap(order => 
    (order.order_items || []).map(item => ({
      ...item,
      orderId: order.id,
    }))
  );

  const grandTotal = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const perPersonAmount = splitMode === 'equal' && numPeople > 0 ? grandTotal / numPeople : 0;
  const change = paymentMethod === 'cash' && cashReceived > grandTotal ? cashReceived - grandTotal : 0;

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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      preparing: 'Preparando',
      ready: 'Pronto',
      served: 'Servido',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'served': return 'bg-purple-500';
      case 'ready': return 'bg-green-500';
      case 'preparing': return 'bg-orange-500';
      default: return 'bg-yellow-500';
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const labels = {
      cash: 'Dinheiro',
      credit: 'Cartão Crédito',
      debit: 'Cartão Débito',
      pix: 'PIX',
    };
    return labels[method];
  };

  const generateReceiptHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Conferência - Mesa ${table.number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 14px; 
            width: 300px; 
            padding: 15px;
            background: #fff;
          }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #000; padding-bottom: 15px; }
          .header h1 { font-size: 18px; margin-bottom: 5px; font-weight: bold; }
          .header h2 { font-size: 16px; margin-bottom: 10px; }
          .header p { font-size: 12px; color: #333; }
          .divider { border-top: 1px dashed #000; margin: 12px 0; }
          .item { display: flex; justify-content: space-between; margin: 8px 0; font-size: 13px; }
          .item-name { flex: 1; padding-right: 10px; }
          .item-qty { width: 40px; text-align: center; font-weight: bold; }
          .item-price { width: 70px; text-align: right; font-weight: bold; }
          .total-section { margin-top: 15px; padding-top: 15px; border-top: 2px solid #000; }
          .total { font-size: 18px; font-weight: bold; display: flex; justify-content: space-between; }
          .split-info { 
            margin-top: 15px; 
            padding: 12px; 
            border: 2px dashed #000; 
            background: #f5f5f5;
            text-align: center;
          }
          .split-info p { margin: 5px 0; }
          .split-info .amount { font-size: 20px; font-weight: bold; }
          .payment-info { margin-top: 15px; padding: 10px; background: #f0f0f0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          .footer p { margin: 3px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${restaurant?.name || 'Restaurante'}</h1>
          <h2>CONFERÊNCIA DE CONTA</h2>
          <p><strong>Mesa ${table.number}</strong></p>
          <p>${formatDateTime(new Date().toISOString())}</p>
        </div>
        
        <div style="font-size: 12px; margin-bottom: 10px;">
          <strong>ITENS CONSUMIDOS</strong>
        </div>
        
        ${allItems.map(item => `
          <div class="item">
            <span class="item-qty">${item.quantity}x</span>
            <span class="item-name">${item.product_name}</span>
            <span class="item-price">${formatCurrency(item.product_price * item.quantity)}</span>
          </div>
        `).join('')}
        
        <div class="total-section">
          <div class="total">
            <span>TOTAL</span>
            <span>${formatCurrency(grandTotal)}</span>
          </div>
        </div>
        
        ${splitMode === 'equal' ? `
          <div class="split-info">
            <p>Divisão por <strong>${numPeople}</strong> pessoas</p>
            <p class="amount">${formatCurrency(perPersonAmount)} / pessoa</p>
          </div>
        ` : ''}
        
        ${paymentMethod === 'cash' && cashReceived > 0 ? `
          <div class="payment-info">
            <div class="item">
              <span>Recebido:</span>
              <span>${formatCurrency(cashReceived)}</span>
            </div>
            <div class="item" style="font-weight: bold;">
              <span>Troco:</span>
              <span>${formatCurrency(change)}</span>
            </div>
          </div>
        ` : ''}
        
        <div class="divider"></div>
        
        <div class="item" style="font-size: 12px;">
          <span>Forma de pagamento:</span>
          <span><strong>${getPaymentMethodLabel(paymentMethod)}</strong></span>
        </div>
        
        <div class="footer">
          <p>━━━━━━━━━━━━━━━━━━━━━</p>
          <p>Obrigado pela preferência!</p>
          <p>Volte sempre!</p>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintReceipt = async () => {
    setPrinting(true);
    
    try {
      // Send to Electron app for thermal printing
      await printConference({
        entityType: 'table',
        entityNumber: table.number,
        customerName: null,
        items: allItems.map(item => ({
          product_name: item.product_name,
          quantity: item.quantity,
          product_price: item.product_price,
        })),
        total: grandTotal,
        splitCount: splitMode === 'equal' ? numPeople : 1,
      });
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('Erro ao imprimir conferência');
    } finally {
      setPrinting(false);
    }
  };

  // Reprint single order via Electron
  const handleReprintOrder = async (order: Order) => {
    setReprintingOrder(order.id);
    setOpenOrderMenu(null);
    
    try {
      // Send to Electron app for thermal printing
      await reprintOrder({
        orderId: order.id,
        orderNumber: order.id.slice(0, 8).toUpperCase(),
      });
    } catch (error) {
      console.error('Error reprinting order:', error);
      toast.error('Erro ao reimprimir pedido');
    } finally {
      setReprintingOrder(null);
    }
  };

  const handleCloseTable = async () => {
    setClosing(true);
    
    try {
      // Update all orders to delivered
      for (const order of orders) {
        await supabase
          .from('orders')
          .update({ status: 'delivered' })
          .eq('id', order.id);
      }
      
      // Set table to available
      await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', table.id);
      
      toast.success(`Mesa ${table.number} fechada com sucesso!`);
      onTableClosed();
    } catch (error: any) {
      console.error('Error closing table:', error);
      toast.error('Erro ao fechar mesa');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  // Close Table Mode
  if (showCloseMode) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
        <header className="sticky top-0 bg-[#1e3a5f] text-white p-4 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => setShowCloseMode(false)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold">Fechar Mesa {table.number}</h1>
              <p className="text-xs opacity-80">{orders.length} pedido(s) • {allItems.length} item(ns)</p>
            </div>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Total Card */}
            <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] rounded-2xl p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-80">Total da Mesa</p>
                  <p className="text-3xl font-bold">{formatCurrency(grandTotal)}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Calculator className="w-7 h-7" />
                </div>
              </div>
            </div>

            {/* Items Summary */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Itens Consumidos
              </h3>
              <div className="space-y-2">
                {allItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.quantity}x {item.product_name}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(item.product_price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Split Mode */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Divisão da Conta</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 ${
                    splitMode === 'none' 
                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5' 
                      : 'border-gray-200'
                  }`}
                  onClick={() => setSplitMode('none')}
                >
                  <Calculator className="w-5 h-5 text-[#1e3a5f]" />
                  <span className="text-sm font-medium">Conta Única</span>
                </button>
                <button
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 ${
                    splitMode === 'equal' 
                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5' 
                      : 'border-gray-200'
                  }`}
                  onClick={() => setSplitMode('equal')}
                >
                  <Users className="w-5 h-5 text-[#1e3a5f]" />
                  <span className="text-sm font-medium">Dividir Igual</span>
                </button>
              </div>

              {splitMode === 'equal' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-2">Número de pessoas:</p>
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={() => setNumPeople(Math.max(2, numPeople - 1))}
                    >
                      -
                    </Button>
                    <span className="text-3xl font-bold w-16 text-center">{numPeople}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-12 w-12"
                      onClick={() => setNumPeople(numPeople + 1)}
                    >
                      +
                    </Button>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">Valor por pessoa:</p>
                    <p className="text-2xl font-bold text-[#1e3a5f]">{formatCurrency(perPersonAmount)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Forma de Pagamento</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'cash', label: 'Dinheiro', icon: Banknote },
                  { id: 'credit', label: 'Crédito', icon: CreditCard },
                  { id: 'debit', label: 'Débito', icon: CreditCard },
                  { id: 'pix', label: 'PIX', icon: QrCode },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    className={`p-3 rounded-xl border-2 flex items-center gap-2 ${
                      paymentMethod === id 
                        ? 'border-[#1e3a5f] bg-[#1e3a5f]/5' 
                        : 'border-gray-200'
                    }`}
                    onClick={() => setPaymentMethod(id as PaymentMethod)}
                  >
                    <Icon className="w-5 h-5 text-[#1e3a5f]" />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'cash' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Valor recebido:</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                      <input
                        type="number"
                        value={cashReceived || ''}
                        onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                        className="w-full pl-10 pr-4 py-3 border rounded-xl text-lg"
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  {cashReceived > grandTotal && (
                    <div className="p-3 bg-green-50 rounded-xl flex justify-between items-center">
                      <span className="text-green-800">Troco:</span>
                      <span className="text-xl font-bold text-green-600">{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="p-4 bg-white border-t space-y-2">
          <Button
            className="w-full h-12 gap-2"
            variant="outline"
            onClick={handlePrintReceipt}
            disabled={printing}
          >
            {printing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Printer className="w-5 h-5" />
                Imprimir Conferência
              </>
            )}
          </Button>
          <Button
            className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg gap-2"
            onClick={handleCloseTable}
            disabled={closing}
          >
            {closing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                Confirmar Pagamento
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Orders List View
  return (
    <div className="min-h-screen bg-[#f5f5f5] flex flex-col">
      <header className="sticky top-0 bg-[#1e3a5f] text-white p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold">Mesa {table.number}</h1>
              <p className="text-xs opacity-80">
                {orders.length} pedido(s) • Total: {formatCurrency(grandTotal)}
              </p>
            </div>
          </div>
          <Badge 
            className={`${
              table.status === 'occupied' ? 'bg-red-500' : 
              table.status === 'closing' ? 'bg-yellow-500' : 'bg-green-500'
            } text-white border-0`}
          >
            {table.status === 'occupied' ? 'Ocupada' : table.status === 'closing' ? 'Fechando' : 'Livre'}
          </Badge>
        </div>
      </header>

      <ScrollArea className="flex-1">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Receipt className="w-16 h-16 mb-4 opacity-50" />
            <p>Nenhum pedido em aberto</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {orders.map((order, idx) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">Pedido #{idx + 1}</span>
                      <Badge className={`${getStatusColor(order.status)} text-white border-0 text-xs`}>
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatTime(order.created_at)}
                      </div>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenOrderMenu(openOrderMenu === order.id ? null : order.id);
                          }}
                        >
                          {reprintingOrder === order.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MoreVertical className="w-4 h-4" />
                          )}
                        </Button>
                        
                        {openOrderMenu === order.id && (
                          <div 
                            className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg z-50 overflow-hidden border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleReprintOrder(order)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-100"
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span className="text-sm font-medium">Reimprimir Pedido</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {order.order_items?.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          {item.quantity}x {item.product_name}
                          {item.notes && <span className="text-xs text-gray-400 ml-1">({item.notes})</span>}
                        </span>
                        <span className="font-medium">{formatCurrency(item.product_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">Subtotal</span>
                    <span className="font-bold text-[#1e3a5f]">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Grand Total */}
            <div className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] rounded-xl p-4 text-white">
              <div className="flex justify-between items-center">
                <span className="text-lg">Total da Mesa</span>
                <span className="text-2xl font-bold">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Actions */}
      {orders.length > 0 && (
        <div className="p-4 bg-white border-t space-y-2">
          <Button
            className="w-full h-12 gap-2"
            variant="outline"
            onClick={handlePrintReceipt}
            disabled={printing}
          >
            {printing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Printer className="w-5 h-5" />
                Imprimir Conferência
              </>
            )}
          </Button>
          <Button
            className="w-full h-14 bg-green-600 hover:bg-green-700 text-lg gap-2"
            onClick={() => setShowCloseMode(true)}
          >
            <Receipt className="w-5 h-5" />
            Fechar Mesa
          </Button>
        </div>
      )}
    </div>
  );
}
