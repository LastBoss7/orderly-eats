import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Clock,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { Table, Tab, Order, OrderItem, formatCurrency, PaymentMethod } from '../types';
import { PaymentModal } from '../components';
import { cn } from '@/lib/utils';

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

// Order card component
function OrderCard({ 
  order, 
  index,
  onReprint,
  reprintingOrderId,
  openOrderMenu,
  setOpenOrderMenu,
}: { 
  order: Order;
  index: number;
  onReprint: (order: Order) => void;
  reprintingOrderId?: string | null;
  openOrderMenu: string | null;
  setOpenOrderMenu: (id: string | null) => void;
}) {
  const statusConfig = {
    pending: { 
      label: 'Pendente', 
      bg: 'bg-amber-500/10', 
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-l-amber-500',
      icon: Clock,
    },
    preparing: { 
      label: 'Preparando', 
      bg: 'bg-blue-500/10', 
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-l-blue-500',
      icon: ChefHat,
    },
    ready: { 
      label: 'Pronto', 
      bg: 'bg-emerald-500/10', 
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-l-emerald-500',
      icon: Sparkles,
    },
  };

  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={cn(
        "relative bg-card rounded-2xl border shadow-sm overflow-hidden",
        "border-l-4",
        status.border,
        "hover:shadow-md transition-shadow duration-200"
      )}
    >
      {/* Order Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
            status.bg,
            status.text
          )}>
            <StatusIcon className="w-3.5 h-3.5" />
            {status.label}
          </div>
          {order.order_number && (
            <span className="text-sm font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
              #{order.order_number}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-foreground">
            {formatCurrency(order.total || 0)}
          </span>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                setOpenOrderMenu(openOrderMenu === order.id ? null : order.id);
              }}
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </Button>
            
            <AnimatePresence>
              {openOrderMenu === order.id && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 bg-popover border rounded-xl shadow-lg z-10 py-1 min-w-36 overflow-hidden"
                >
                  <button
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted flex items-center gap-2.5 transition-colors"
                    onClick={() => {
                      setOpenOrderMenu(null);
                      onReprint(order);
                    }}
                    disabled={reprintingOrderId === order.id}
                  >
                    {reprintingOrderId === order.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <RotateCcw className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span>Reimprimir</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="p-4 space-y-2">
        {order.order_items?.map((item: OrderItem, itemIndex: number) => (
          <motion.div 
            key={item.id} 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 + itemIndex * 0.02 }}
            className="flex justify-between items-start gap-2"
          >
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                {item.quantity}
              </span>
              <span className="text-sm text-foreground truncate">
                {item.product_name}
              </span>
            </div>
            <span className="text-sm font-medium text-muted-foreground flex-shrink-0">
              {formatCurrency(item.product_price * item.quantity)}
            </span>
          </motion.div>
        ))}
        
        {order.notes && (
          <div className="mt-3 pt-3 border-t border-dashed">
            <p className="text-xs text-muted-foreground italic flex items-start gap-2">
              <span className="flex-shrink-0">📝</span>
              <span>{order.notes}</span>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex flex-col"
    >
      {/* Premium Header */}
      <header className="sticky top-0 z-20">
        <div className="bg-primary px-4 pt-4 pb-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-primary-foreground">{entityLabel}</h1>
                {entityType === 'tab' && onEditTabCustomer && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-full"
                    onClick={onEditTabCustomer}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-primary-foreground/70">
                {orders.length} pedido{orders.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        
        {/* Total Card - overlapping header */}
        <div className="px-4 -mt-4">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl shadow-lg border p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-sm font-medium">Total da conta</span>
              </div>
              <span className="text-2xl font-bold text-foreground">
                {formatCurrency(total)}
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11 gap-2 rounded-xl font-medium"
                onClick={onPrintReceipt}
              >
                <Printer className="w-4 h-4" />
                Conferência
              </Button>
              <Button
                className="flex-1 h-11 gap-2 rounded-xl font-medium bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setShowPaymentModal(true)}
                disabled={orders.length === 0}
              >
                <DollarSign className="w-4 h-4" />
                Fechar Conta
              </Button>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Orders List */}
      <ScrollArea className="flex-1 px-4 pt-4 pb-24">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando pedidos...</p>
          </div>
        ) : orders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
              <ChefHat className="w-10 h-10 text-muted-foreground/50" />
            </div>
            <p className="font-semibold text-foreground mb-1">Nenhum pedido</p>
            <p className="text-sm text-muted-foreground">
              Toque no botão abaixo para adicionar itens
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3 pb-4">
            {orders.map((order, index) => (
              <OrderCard
                key={order.id}
                order={order}
                index={index}
                onReprint={onReprintOrder}
                reprintingOrderId={reprintingOrderId}
                openOrderMenu={openOrderMenu}
                setOpenOrderMenu={setOpenOrderMenu}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            className="w-full h-14 text-lg rounded-2xl shadow-lg gap-2 font-semibold"
            onClick={onNewOrder}
          >
            <PlusCircle className="w-5 h-5" />
            Novo Pedido
          </Button>
        </motion.div>
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
