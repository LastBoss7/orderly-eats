import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Loader2, 
  ArrowRightLeft,
  Receipt,
  User,
  Package,
  ArrowRight,
} from 'lucide-react';

interface Tab {
  id: string;
  number: number;
  customer_name: string | null;
  status: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  notes: string | null;
}

interface Order {
  id: string;
  total: number;
  order_items: OrderItem[];
}

interface TransferItemsModalProps {
  open: boolean;
  onClose: () => void;
  sourceTab: Tab | null;
  onTransferComplete: () => void;
}

export function TransferItemsModal({ 
  open, 
  onClose, 
  sourceTab,
  onTransferComplete,
}: TransferItemsModalProps) {
  const { restaurant } = useAuth();
  const [availableTabs, setAvailableTabs] = useState<Tab[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [targetTabId, setTargetTabId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);

  // Get all items from all orders
  const allItems = orders.flatMap(order => 
    order.order_items.map(item => ({
      ...item,
      orderId: order.id,
    }))
  );

  const selectedTotal = allItems
    .filter(item => selectedItems.includes(item.id))
    .reduce((sum, item) => sum + (item.product_price * item.quantity), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Fetch data
  useEffect(() => {
    if (!open || !restaurant?.id || !sourceTab) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Get all tabs except source
        const { data: tabs, error: tabsError } = await supabase
          .from('tabs')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .neq('id', sourceTab.id)
          .order('number');

        if (tabsError) throw tabsError;

        // Get orders with items from source tab
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, total, order_items (*)')
          .eq('tab_id', sourceTab.id)
          .in('status', ['pending', 'preparing', 'ready', 'served']);

        if (ordersError) throw ordersError;

        setAvailableTabs((tabs || []) as Tab[]);
        setOrders((ordersData || []) as Order[]);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    setSelectedItems([]);
    setTargetTabId('');
  }, [open, restaurant?.id, sourceTab]);

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAllItems = () => {
    if (selectedItems.length === allItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(allItems.map(item => item.id));
    }
  };

  const handleTransfer = async () => {
    if (!sourceTab || !targetTabId || selectedItems.length === 0) return;

    setTransferring(true);
    try {
      const targetTab = availableTabs.find(t => t.id === targetTabId);
      
      // Get items to transfer grouped by order
      const itemsByOrder: Record<string, OrderItem[]> = {};
      for (const itemId of selectedItems) {
        const item = allItems.find(i => i.id === itemId);
        if (item) {
          if (!itemsByOrder[item.orderId]) {
            itemsByOrder[item.orderId] = [];
          }
          itemsByOrder[item.orderId].push(item);
        }
      }

      // For each order, check if we're transferring all items or just some
      for (const [orderId, items] of Object.entries(itemsByOrder)) {
        const order = orders.find(o => o.id === orderId);
        if (!order) continue;

        const allItemsSelected = order.order_items.every(
          oi => selectedItems.includes(oi.id)
        );

        if (allItemsSelected) {
          // Transfer entire order to target tab
          await supabase
            .from('orders')
            .update({ tab_id: targetTabId })
            .eq('id', orderId);
        } else {
          // Create new order for target tab with selected items
          const transferTotal = items.reduce(
            (sum, item) => sum + (item.product_price * item.quantity), 
            0
          );

          const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert({
              restaurant_id: restaurant?.id,
              tab_id: targetTabId,
              order_type: 'tab',
              status: 'served',
              total: transferTotal,
              notes: `Transferido da comanda #${sourceTab.number}`,
            })
            .select()
            .single();

          if (orderError) throw orderError;

          // Move items to new order
          await supabase
            .from('order_items')
            .update({ order_id: newOrder.id })
            .in('id', items.map(i => i.id));

          // Update original order total
          const remainingTotal = order.total - transferTotal;
          await supabase
            .from('orders')
            .update({ total: Math.max(0, remainingTotal) })
            .eq('id', orderId);
        }
      }

      // Update target tab status to occupied if it was available
      if (targetTab?.status === 'available') {
        await supabase
          .from('tabs')
          .update({ status: 'occupied' })
          .eq('id', targetTabId);
      }

      // Check if source tab has any remaining items
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('tab_id', sourceTab.id)
        .in('status', ['pending', 'preparing', 'ready', 'served']);

      if (count === 0) {
        // No more orders, free up source tab
        await supabase
          .from('tabs')
          .update({ status: 'available', customer_name: null })
          .eq('id', sourceTab.id);
      }

      toast.success(
        `${selectedItems.length} item(s) transferido(s) para comanda #${targetTab?.number}`
      );
      onTransferComplete();
      onClose();
    } catch (error: any) {
      console.error('Error transferring items:', error);
      toast.error('Erro ao transferir itens: ' + error.message);
    } finally {
      setTransferring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            Transferir Itens
          </DialogTitle>
        </DialogHeader>

        {/* Source Tab Info */}
        <div className="bg-muted/50 rounded-xl p-4 border">
          <p className="text-sm text-muted-foreground mb-1">Da comanda</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">#{sourceTab?.number}</span>
            {sourceTab?.customer_name && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                {sourceTab.customer_name}
              </span>
            )}
          </div>
        </div>

        {/* Target Tab Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Para a comanda:</label>
          <Select value={targetTabId} onValueChange={setTargetTabId}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Selecione a comanda destino" />
            </SelectTrigger>
            <SelectContent>
              {availableTabs.map(tab => (
                <SelectItem key={tab.id} value={tab.id}>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">#{tab.number}</span>
                    {tab.customer_name && (
                      <span className="text-muted-foreground">
                        - {tab.customer_name}
                      </span>
                    )}
                    <Badge variant={tab.status === 'occupied' ? 'default' : 'secondary'}>
                      {tab.status === 'available' ? 'Livre' : 'Ocupada'}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Items Selection */}
        <div className="flex-1 min-h-0 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Itens para transferir:</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllItems}
              className="text-xs"
            >
              {selectedItems.length === allItems.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : allItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">
                Nenhum item nesta comanda
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[200px] border rounded-xl">
              <div className="p-2 space-y-1">
                {allItems.map(item => (
                  <div
                    key={item.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                      ${selectedItems.includes(item.id) 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'hover:bg-muted/50'
                      }
                    `}
                    onClick={() => toggleItemSelection(item.id)}
                  >
                    <Checkbox 
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {item.quantity}x {item.product_name}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {formatCurrency(item.product_price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Summary */}
        {selectedItems.length > 0 && (
          <div className="bg-primary/10 rounded-xl p-4 border border-primary/20 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Selecionado</p>
              <p className="text-lg font-bold">{selectedItems.length} item(s)</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(selectedTotal)}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={transferring}>
            Cancelar
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={selectedItems.length === 0 || !targetTabId || transferring}
            className="gap-2"
          >
            {transferring ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Transferir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
