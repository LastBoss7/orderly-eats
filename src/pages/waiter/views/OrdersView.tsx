import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Printer, 
  DollarSign, 
  PlusCircle, 
  Loader2,
  MoreVertical,
  RotateCcw,
  ChefHat,
  Pencil,
} from 'lucide-react';
import { Table, Tab, Order, OrderItem, formatCurrency, getSizeLabel, PaymentMethod } from '../types';
import { PaymentModal } from '../components';

interface OrdersViewProps {
  entityType: 'table' | 'tab';
  table?: Table | null;
  tab?: Tab | null;
  orders: Order[];
  isLoading: boolean;
  onBack: () => void;
  onNewOrder: () => void;
  onPrintReceipt: () => void;
  onReprintOrder: (order: Order) => void;
  onCloseAccount: (paymentMethod: PaymentMethod, cashReceived: number) => Promise<void>;
  onEditTabCustomer?: () => void;
  reprintingOrderId?: string | null;
}

export function OrdersView({
  entityType,
  table,
  tab,
  orders,
  isLoading,
  onBack,
  onNewOrder,
  onPrintReceipt,
  onReprintOrder,
  onCloseAccount,
  onEditTabCustomer,
  reprintingOrderId,
}: OrdersViewProps) {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [openOrderMenu, setOpenOrderMenu] = useState<string | null>(null);

  const total = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  
  const entityNumber = entityType === 'table' 
    ? table?.number || 0 
    : tab?.number || 0;
  
  const entityLabel = entityType === 'table'
    ? `Mesa ${entityNumber}`
    : tab?.customer_name || `Comanda #${entityNumber}`;

  const handleConfirmClose = async () => {
    setIsClosing(true);
    try {
      await onCloseAccount(paymentMethod, cashReceived);
      setShowPaymentModal(false);
    } finally {
      setIsClosing(false);
    }
  };

  const statusColors = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    preparing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  const statusLabels = {
    pending: 'Pendente',
    preparing: 'Preparando',
    ready: 'Pronto',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="min-h-screen bg-background flex flex-col"
    >
      {/* Header */}
      <header className="sticky top-0 bg-primary text-primary-foreground p-4 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold">{entityLabel}</h1>
            <p className="text-xs text-primary-foreground/70">
              {orders.length} pedido{orders.length !== 1 ? 's' : ''} • Total: {formatCurrency(total)}
            </p>
          </div>
          {entityType === 'tab' && onEditTabCustomer && (
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={onEditTabCustomer}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Quick Actions */}
      <div className="flex gap-2 p-3 bg-card border-b">
        <Button
          variant="outline"
          className="flex-1 h-10 gap-2"
          onClick={onPrintReceipt}
        >
          <Printer className="w-4 h-4" />
          Conferência
        </Button>
        <Button
          variant="outline"
          className="flex-1 h-10 gap-2"
          onClick={() => setShowPaymentModal(true)}
          disabled={orders.length === 0}
        >
          <DollarSign className="w-4 h-4" />
          Fechar
        </Button>
      </div>

      {/* Orders List */}
      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ChefHat className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum pedido</p>
            <p className="text-sm">Adicione itens para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-card rounded-xl border shadow-sm overflow-hidden"
              >
                {/* Order Header */}
                <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status as keyof typeof statusColors] || statusColors.pending}`}>
                      {statusLabels[order.status as keyof typeof statusLabels] || order.status}
                    </span>
                    {order.order_number && (
                      <span className="text-sm font-mono text-muted-foreground">
                        #{order.order_number}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">
                      {formatCurrency(order.total || 0)}
                    </span>
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
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                      {openOrderMenu === order.id && (
                        <div className="absolute right-0 top-full mt-1 bg-popover border rounded-lg shadow-lg z-10 py-1 min-w-32">
                          <button
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                            onClick={() => {
                              setOpenOrderMenu(null);
                              onReprintOrder(order);
                            }}
                            disabled={reprintingOrderId === order.id}
                          >
                            {reprintingOrderId === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                            Reimprimir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-3 space-y-2">
                  {order.order_items?.map((item: OrderItem) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-foreground">
                        {item.quantity}x {item.product_name}
                      </span>
                      <span className="text-muted-foreground">
                        {formatCurrency(item.product_price * item.quantity)}
                      </span>
                    </div>
                  ))}
                  {order.notes && (
                    <p className="text-xs text-muted-foreground italic pt-1 border-t">
                      {order.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 bg-card border-t">
        <Button
          className="w-full h-14 text-lg"
          onClick={onNewOrder}
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Novo Pedido
        </Button>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          entityType={entityType}
          entityNumber={entityNumber}
          customerName={tab?.customer_name}
          total={total}
          paymentMethod={paymentMethod}
          cashReceived={cashReceived}
          isClosing={isClosing}
          onPaymentMethodChange={setPaymentMethod}
          onCashReceivedChange={setCashReceived}
          onConfirm={handleConfirmClose}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </motion.div>
  );
}
