import { useEffect, useState } from 'react';
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
import { 
  Plus, 
  Users, 
  Loader2,
  Receipt,
  Clock,
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

  const fetchTables = async () => {
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
  };

  useEffect(() => {
    fetchTables();
  }, [restaurant?.id]);

  const fetchTableOrders = async (tableId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('table_id', tableId)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTableOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleTableClick = async (table: Table) => {
    setSelectedTable(table);
    await fetchTableOrders(table.id);
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

              {/* Orders */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  Pedidos da Mesa
                </h3>
                <ScrollArea className="h-[400px]">
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
                              {order.status}
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
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
