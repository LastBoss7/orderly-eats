import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowRight, UtensilsCrossed } from 'lucide-react';

interface Table {
  id: string;
  number: number;
  status: string;
}

interface Order {
  id: string;
  order_type: string | null;
  customer_name: string | null;
  total: number | null;
}

interface MoveToTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onOrderMoved: () => void;
}

export function MoveToTableModal({ 
  open, 
  onOpenChange, 
  order, 
  onOrderMoved 
}: MoveToTableModalProps) {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingTables, setFetchingTables] = useState(false);

  useEffect(() => {
    if (open && restaurant?.id) {
      fetchTables();
    }
  }, [open, restaurant?.id]);

  const fetchTables = async () => {
    setFetchingTables(true);
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('id, number, status')
        .order('number');

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setFetchingTables(false);
    }
  };

  const handleMoveToTable = async () => {
    if (!order || !selectedTableId) return;

    setLoading(true);
    try {
      // Update order with table_id and change type to 'table'
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          table_id: selectedTableId,
          order_type: 'table',
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // Update table status to occupied
      const { error: tableError } = await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', selectedTableId);

      if (tableError) throw tableError;

      const selectedTable = tables.find(t => t.id === selectedTableId);
      toast({
        title: 'Pedido movido!',
        description: `Pedido #${order.id.slice(0, 4).toUpperCase()} foi movido para a Mesa ${selectedTable?.number}`,
      });

      onOpenChange(false);
      setSelectedTableId('');
      onOrderMoved();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao mover pedido',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const availableTables = tables.filter(t => t.status === 'available');
  const occupiedTables = tables.filter(t => t.status !== 'available');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5" />
            Mover para Mesa
          </DialogTitle>
          <DialogDescription>
            O cliente decidiu comer no local? Mova este pedido para uma mesa.
          </DialogDescription>
        </DialogHeader>

        {order && (
          <div className="space-y-6 py-4">
            {/* Order Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">Pedido #{order.id.slice(0, 4).toUpperCase()}</span>
                <span className="font-bold text-primary">{formatCurrency(order.total)}</span>
              </div>
              {order.customer_name && (
                <p className="text-sm text-muted-foreground">{order.customer_name}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 bg-secondary rounded text-secondary-foreground">
                  {order.order_type === 'counter' ? 'Balcão' : order.order_type}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="px-2 py-0.5 bg-primary/10 rounded text-primary font-medium">
                  Mesa
                </span>
              </div>
            </div>

            {/* Table Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selecione a Mesa</Label>
              {fetchingTables ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : tables.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Nenhuma mesa cadastrada</p>
                </div>
              ) : (
                <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Escolha uma mesa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTables.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Mesas Livres
                        </div>
                        {availableTables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-success" />
                              Mesa {table.number}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {occupiedTables.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                          Mesas Ocupadas
                        </div>
                        {occupiedTables.map((table) => (
                          <SelectItem key={table.id} value={table.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-destructive" />
                              Mesa {table.number}
                              <span className="text-xs text-muted-foreground">(ocupada)</span>
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleMoveToTable}
            disabled={loading || !selectedTableId}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ArrowRight className="w-4 h-4" />
                Mover para Mesa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
