import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { CloseTableModal } from '@/components/tables/CloseTableModal';
import { 
  Plus, 
  Users, 
  Loader2,
  Receipt,
  Clock,
  ChefHat,
  CheckCircle2,
  Utensils,
  DollarSign,
} from 'lucide-react';

interface Table {
  id: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'closing';
}

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  order_items?: OrderItem[];
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  notes: string | null;
}

export default function Tables() {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [adding, setAdding] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [allTableOrders, setAllTableOrders] = useState<Order[]>([]);

  const fetchTables = useCallback(async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('number');

      if (error) throw error;
      setTables((data || []) as Table[]);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Realtime subscription for tables
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel('tables-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tables',
        },
        () => {
          fetchTables();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, fetchTables]);

  const fetchTableOrders = async (tableId: string, includeDelivered = false) => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('table_id', tableId);

      if (includeDelivered) {
        // For close modal, include all orders except cancelled
        query = query.in('status', ['pending', 'preparing', 'ready', 'delivered']);
      } else {
        // For sheet display, only active orders
        query = query.in('status', ['pending', 'preparing', 'ready']);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching orders:', error);
      return [];
    }
  };

  const handleTableClick = async (table: Table) => {
    setSelectedTable(table);
    const orders = await fetchTableOrders(table.id);
    setTableOrders(orders);
    // Also fetch all orders for close modal (including delivered ones for accounting)
    const allOrders = await fetchTableOrders(table.id, false);
    setAllTableOrders(allOrders);
  };

  const handleOpenCloseModal = async () => {
    if (!selectedTable) return;
    // Fetch active orders for closing
    const orders = await fetchTableOrders(selectedTable.id);
    setAllTableOrders(orders);
    setShowCloseModal(true);
  };

  const handleTableClosed = () => {
    setSelectedTable(null);
    fetchTables();
  };

  const handleAddTable = async () => {
    if (!newTableNumber) return;

    setAdding(true);
    try {
      const { error } = await supabase.from('tables').insert({
        restaurant_id: restaurant?.id,
        number: parseInt(newTableNumber),
        capacity: parseInt(newTableCapacity) || 4,
        status: 'available',
      });

      if (error) throw error;

      toast({ title: 'Mesa adicionada!' });
      setShowAddDialog(false);
      setNewTableNumber('');
      setNewTableCapacity('4');
      fetchTables();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar mesa',
        description: error.message,
      });
    } finally {
      setAdding(false);
    }
  };

  const updateTableStatus = async (tableId: string, status: Table['status']) => {
    try {
      const { error } = await supabase
        .from('tables')
        .update({ status })
        .eq('id', tableId);

      if (error) throw error;

      fetchTables();
      if (selectedTable?.id === tableId) {
        setSelectedTable({ ...selectedTable, status });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar mesa',
        description: error.message,
      });
    }
  };

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

  const getStatusLabel = (status: Table['status']) => {
    const labels = {
      available: 'Livre',
      occupied: 'Ocupada',
      closing: 'Fechando',
    };
    return labels[status];
  };

  const getOrderStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      preparing: 'Em Preparo',
      ready: 'Pronto',
      delivered: 'Entregue',
    };
    return labels[status] || status;
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: status === 'preparing' ? 'Enviado para cozinha!' : 'Status atualizado!',
        description: `Pedido marcado como "${getOrderStatusLabel(status)}"`,
      });

      // Refresh orders
      if (selectedTable) {
        await fetchTableOrders(selectedTable.id);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar pedido',
        description: error.message,
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mesas</h1>
            <p className="text-muted-foreground">
              Gerencie as mesas do restaurante
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Mesa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Mesa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Número da Mesa</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 1"
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capacidade</Label>
                  <Input
                    type="number"
                    placeholder="Ex: 4"
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleAddTable}
                  disabled={adding || !newTableNumber}
                >
                  {adding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Adicionar'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-success" />
            <span className="text-sm text-muted-foreground">Livre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-destructive" />
            <span className="text-sm text-muted-foreground">Ocupada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-warning" />
            <span className="text-sm text-muted-foreground">Fechando Conta</span>
          </div>
        </div>

        {/* Tables Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Users className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">Nenhuma mesa cadastrada</p>
            <p className="text-sm">Clique em "Nova Mesa" para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className={`table-card ${table.status}`}
                onClick={() => handleTableClick(table)}
              >
                <span className="text-3xl font-bold mb-1">{table.number}</span>
                <span className="text-sm opacity-90">
                  {getStatusLabel(table.status)}
                </span>
                <div className="flex items-center gap-1 mt-2 text-xs opacity-75">
                  <Users className="w-3 h-3" />
                  <span>{table.capacity} lugares</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table Detail Sheet */}
        <Sheet open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                Mesa {selectedTable?.number}
                <span
                  className={`status-badge ${selectedTable?.status}`}
                >
                  {selectedTable && getStatusLabel(selectedTable.status)}
                </span>
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Status Actions */}
              <div className="flex gap-2">
                <Button
                  variant={selectedTable?.status === 'available' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => selectedTable && updateTableStatus(selectedTable.id, 'available')}
                >
                  Livre
                </Button>
                <Button
                  variant={selectedTable?.status === 'occupied' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => selectedTable && updateTableStatus(selectedTable.id, 'occupied')}
                >
                  Ocupada
                </Button>
                <Button
                  variant={selectedTable?.status === 'closing' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => selectedTable && updateTableStatus(selectedTable.id, 'closing')}
                >
                  Fechando
                </Button>
              </div>

              {/* Close Table Button */}
              {tableOrders.length > 0 && (
                <Button
                  className="w-full gap-2"
                  variant="default"
                  onClick={handleOpenCloseModal}
                >
                  <DollarSign className="w-4 h-4" />
                  Fechar Mesa
                </Button>
              )}

              {/* Orders */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Pedidos da Mesa
                </h3>
                <ScrollArea className="h-[350px]">
                  {tableOrders.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Nenhum pedido aberto nesta mesa
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {tableOrders.map((order) => (
                        <div
                          key={order.id}
                          className="p-4 bg-muted/50 rounded-lg space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatTime(order.created_at)}
                            </div>
                            <span className={`status-badge ${order.status}`}>
                              {getOrderStatusLabel(order.status)}
                            </span>
                          </div>
                          {order.order_items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between text-sm"
                            >
                              <span>
                                {item.quantity}x {item.product_name}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(item.product_price * item.quantity)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between font-semibold pt-2 border-t">
                            <span>Total</span>
                            <span>{formatCurrency(order.total)}</span>
                          </div>

                          {/* Order Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            {order.status === 'pending' && (
                              <Button
                                size="sm"
                                className="flex-1 gap-2"
                                onClick={() => updateOrderStatus(order.id, 'preparing')}
                              >
                                <ChefHat className="w-4 h-4" />
                                Enviar para Cozinha
                              </Button>
                            )}
                            {order.status === 'preparing' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 gap-2 border-success text-success hover:bg-success hover:text-success-foreground"
                                onClick={() => updateOrderStatus(order.id, 'ready')}
                              >
                                <Utensils className="w-4 h-4" />
                                Marcar como Pronto
                              </Button>
                            )}
                            {order.status === 'ready' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Marcar como Entregue
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Close Table Modal */}
        <CloseTableModal
          open={showCloseModal}
          onClose={() => setShowCloseModal(false)}
          table={selectedTable}
          orders={allTableOrders}
          onTableClosed={handleTableClosed}
        />
      </div>
    </DashboardLayout>
  );
}
