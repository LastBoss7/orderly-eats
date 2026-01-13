import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CloseTableModal } from '@/components/tables/CloseTableModal';
import { TableOrderPOS } from '@/components/tables/TableOrderPOS';
import { TabsGrid } from '@/components/tabs/TabsGrid';
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
  ShoppingCart,
  LayoutGrid,
  Hash,
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
  const [showOrderPOS, setShowOrderPOS] = useState(false);
  const [orderPOSTable, setOrderPOSTable] = useState<Table | null>(null);
  const [activeTab, setActiveTab] = useState('mesas');
  const [tabOrderPOS, setTabOrderPOS] = useState<{ id: string; number: number } | null>(null);

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

  const handleOpenOrderPOS = (table: Table) => {
    setOrderPOSTable(table);
    setShowOrderPOS(true);
    setSelectedTable(null);
  };

  const handleOrderCreated = async () => {
    if (orderPOSTable) {
      const orders = await fetchTableOrders(orderPOSTable.id);
      setTableOrders(orders);
    }
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
      <div className="page-container animate-fade-in">
        {/* Header */}
        <div className="page-header mb-4">
          <div>
            <h1 className="page-title">Salão</h1>
            <p className="page-description">
              Gerencie mesas e comandas do seu estabelecimento
            </p>
          </div>
          
          {/* Legend */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-xs text-muted-foreground">Livre</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-xs text-muted-foreground">Ocupada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-xs text-muted-foreground">Fechando conta</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="mesas" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Mesas
            </TabsTrigger>
            <TabsTrigger value="comandas" className="gap-2">
              <Hash className="w-4 h-4" />
              Comandas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mesas" className="mt-0">
            {/* Add Table Button */}
            <div className="flex justify-end mb-6">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="lg" className="gap-2 shadow-lg shadow-primary/25">
                    <Plus className="w-5 h-5" />
                    Nova Mesa
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl">Adicionar Mesa</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 pt-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Número da Mesa</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 1"
                        value={newTableNumber}
                        onChange={(e) => setNewTableNumber(e.target.value)}
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Capacidade (lugares)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 4"
                        value={newTableCapacity}
                        onChange={(e) => setNewTableCapacity(e.target.value)}
                        className="h-12"
                      />
                    </div>
                    <Button
                      className="w-full h-12 text-base font-semibold"
                      onClick={handleAddTable}
                      disabled={adding || !newTableNumber}
                    >
                      {adding ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        'Adicionar Mesa'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Tables Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground">Carregando mesas...</p>
                </div>
              </div>
            ) : tables.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Users className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-xl font-semibold text-foreground mb-2">Nenhuma mesa cadastrada</p>
                <p className="text-muted-foreground mb-4">Comece adicionando sua primeira mesa</p>
                <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Mesa
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {tables.map((table) => (
                  <div
                    key={table.id}
                    className={`table-card ${table.status}`}
                    onClick={() => handleTableClick(table)}
                  >
                    <span className="text-4xl font-extrabold mb-2">{table.number}</span>
                    <span className="text-sm font-medium opacity-90">
                      {getStatusLabel(table.status)}
                    </span>
                    <div className="flex items-center gap-1.5 mt-3 text-xs opacity-80">
                      <Users className="w-4 h-4" />
                      <span>{table.capacity} lugares</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="comandas" className="mt-0">
            <TabsGrid 
              onOpenOrderPOS={(tab) => {
                setTabOrderPOS({ id: tab.id, number: tab.number });
                setShowOrderPOS(true);
              }} 
            />
          </TabsContent>
        </Tabs>

        {/* Table Detail Sheet */}
        <Sheet open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
          <SheetContent className="w-full sm:max-w-lg p-0">
            <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <SheetTitle className="flex items-center gap-3 text-xl">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">{selectedTable?.number}</span>
                </div>
                <div>
                  <span className="block">Mesa {selectedTable?.number}</span>
                  <span
                    className={`status-badge ${selectedTable?.status} mt-1`}
                  >
                    {selectedTable && getStatusLabel(selectedTable.status)}
                  </span>
                </div>
              </SheetTitle>
            </SheetHeader>

            <div className="p-6 space-y-6">
              {/* Status Actions */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Alterar Status</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={selectedTable?.status === 'available' ? 'default' : 'outline'}
                    className="h-12"
                    onClick={() => selectedTable && updateTableStatus(selectedTable.id, 'available')}
                  >
                    Livre
                  </Button>
                  <Button
                    variant={selectedTable?.status === 'occupied' ? 'default' : 'outline'}
                    className="h-12"
                    onClick={() => selectedTable && updateTableStatus(selectedTable.id, 'occupied')}
                  >
                    Ocupada
                  </Button>
                  <Button
                    variant={selectedTable?.status === 'closing' ? 'default' : 'outline'}
                    className="h-12"
                    onClick={() => selectedTable && updateTableStatus(selectedTable.id, 'closing')}
                  >
                    Fechando
                  </Button>
                </div>
              </div>

              {/* New Order Button */}
              <Button
                className="w-full gap-2 h-14 text-base font-semibold bg-success hover:bg-success/90 shadow-lg"
                onClick={() => selectedTable && handleOpenOrderPOS(selectedTable)}
              >
                <ShoppingCart className="w-5 h-5" />
                Lançar Pedido
              </Button>

              {/* Close Table Button */}
              {tableOrders.length > 0 && (
                <Button
                  className="w-full gap-2 h-14 text-base font-semibold shadow-lg shadow-primary/25"
                  variant="default"
                  onClick={handleOpenCloseModal}
                >
                  <DollarSign className="w-5 h-5" />
                  Fechar Mesa
                </Button>
              )}

              {/* Orders */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-base">
                  <Receipt className="w-5 h-5 text-primary" />
                  Pedidos da Mesa
                  {tableOrders.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {tableOrders.length} {tableOrders.length === 1 ? 'pedido' : 'pedidos'}
                    </Badge>
                  )}
                </h3>
                <ScrollArea className="h-[320px]">
                  {tableOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                        <Receipt className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">
                        Nenhum pedido aberto nesta mesa
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tableOrders.map((order) => (
                        <div
                          key={order.id}
                          className="p-4 bg-card rounded-xl border space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
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
                              <span className="text-muted-foreground">
                                {item.quantity}x {item.product_name}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(item.product_price * item.quantity)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between font-semibold pt-3 border-t">
                            <span>Total</span>
                            <span className="text-primary">{formatCurrency(order.total)}</span>
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

        {/* Order POS Full Screen */}
        {showOrderPOS && orderPOSTable && (
          <div className="fixed inset-0 z-50 bg-background">
            <TableOrderPOS
              table={orderPOSTable}
              onClose={() => {
                setShowOrderPOS(false);
                setOrderPOSTable(null);
              }}
              onOrderCreated={handleOrderCreated}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
