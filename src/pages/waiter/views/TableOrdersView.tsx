import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Users,
  ClipboardList,
  Loader2,
  User,
  MoreVertical,
  RotateCcw,
  FileText,
  RefreshCw,
  DollarSign,
  PlusCircle,
} from 'lucide-react';
import { Table, Order, formatCurrency } from '../types';

interface TableOrdersViewProps {
  table: Table;
  orders: Order[];
  loading: boolean;
  onBack: () => void;
  onNewOrder: () => void;
  onPrintReceipt: () => void;
  onCloseTable: () => void;
  onReprintOrder: (order: Order) => void;
}

export function TableOrdersView({
  table,
  orders,
  loading,
  onBack,
  onNewOrder,
  onPrintReceipt,
  onCloseTable,
  onReprintOrder,
}: TableOrdersViewProps) {
  const [deliveredOrders, setDeliveredOrders] = useState<Set<string>>(new Set());
  const [openOrderMenu, setOpenOrderMenu] = useState<string | null>(null);
  const [reprintingOrder, setReprintingOrder] = useState<string | null>(null);

  const ordersTotal = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  const handleMarkDelivered = (orderId: string) => {
    setDeliveredOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleReprintOrder = async (order: Order) => {
    setReprintingOrder(order.id);
    setOpenOrderMenu(null);
    await onReprintOrder(order);
    setReprintingOrder(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen bg-background flex flex-col"
    >
      {/* Header */}
      <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-10 shadow-lg flex items-center justify-between">
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
            <h1 className="font-bold text-xl">Mesa {table.number}</h1>
            <p className="text-xs text-primary-foreground/70">{orders.length} pedido(s)</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
          <Users className="w-5 h-5" />
        </div>
      </header>

      {/* Orders List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                <ClipboardList className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">Nenhum pedido ativo</p>
              <p className="text-muted-foreground/60 text-sm mt-1">Adicione um novo pedido</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-card rounded-xl overflow-hidden border shadow-sm">
                {/* Order Header */}
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">#{order.order_number || '---'}</span>
                      {order.status === 'ready' && (
                        <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-xs">
                          ✓ Pronto
                        </Badge>
                      )}
                      {order.status === 'preparing' && (
                        <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30 text-xs">
                          🍳 Preparando
                        </Badge>
                      )}
                      {order.status === 'pending' && (
                        <Badge className="bg-blue-500/20 text-blue-600 border-blue-500/30 text-xs">
                          ⏳ Pendente
                        </Badge>
                      )}
                    </div>
                    {order.waiters?.name && (
                      <p className="text-muted-foreground text-xs mt-1.5 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {order.waiters.name}
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenOrderMenu(openOrderMenu === order.id ? null : order.id);
                      }}
                    >
                      {reprintingOrder === order.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <MoreVertical className="w-5 h-5" />
                      )}
                    </Button>
                    
                    {openOrderMenu === order.id && (
                      <div 
                        className="absolute right-0 top-full mt-1 w-48 bg-popover rounded-xl shadow-lg z-50 overflow-hidden border"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleReprintOrder(order)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span className="text-sm font-medium">Reimprimir Pedido</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Order Items */}
                <div className="p-4 space-y-3">
                  {order.order_items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-primary text-xs font-bold">{item.quantity}x</span>
                        </div>
                        <span className="font-medium">{item.product_name}</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(item.product_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                
                {/* Order Footer */}
                <div className="p-4 border-t bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-bold text-lg">{formatCurrency(order.total || 0)}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <Checkbox 
                      id={`delivered-${order.id}`}
                      checked={deliveredOrders.has(order.id)}
                      onCheckedChange={() => handleMarkDelivered(order.id)}
                    />
                    <label htmlFor={`delivered-${order.id}`} className="text-muted-foreground text-sm cursor-pointer">
                      Marcar como entregue
                    </label>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="bg-card border-t p-4">
        <div className="flex justify-between text-muted-foreground mb-2 text-sm">
          <span>Subtotal</span>
          <span>{formatCurrency(ordersTotal)}</span>
        </div>
        <div className="flex justify-between text-xl font-bold mb-5">
          <span>Total</span>
          <span>{formatCurrency(ordersTotal)}</span>
        </div>
        
        {/* Actions */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Button 
            variant="outline" 
            className="h-14 flex flex-col items-center gap-1"
            onClick={onPrintReceipt}
          >
            <FileText className="w-5 h-5" />
            <span className="text-xs">Conferência</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-14 flex flex-col items-center gap-1"
            disabled
          >
            <RefreshCw className="w-5 h-5" />
            <span className="text-xs">Transferir</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-14 flex flex-col items-center gap-1"
            onClick={onCloseTable}
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-xs">Fechar</span>
          </Button>
        </div>
        
        <Button 
          className="w-full h-14 text-base font-semibold gap-2"
          onClick={onNewOrder}
        >
          <PlusCircle className="w-5 h-5" />
          Novo Pedido
        </Button>
      </div>
    </motion.div>
  );
}
