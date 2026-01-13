import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Loader2, 
  Receipt,
  Clock,
  ChefHat,
  CheckCircle2,
  DollarSign,
  ShoppingCart,
  ChevronDown,
  User,
  Hash,
} from 'lucide-react';

interface Tab {
  id: string;
  number: number;
  customer_name: string | null;
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

interface TabsGridProps {
  onOpenOrderPOS: (tab: Tab) => void;
}

export function TabsGrid({ onOpenOrderPOS }: TabsGridProps) {
  const { restaurant } = useAuth();
  const { toast } = useToast();
  
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Create tab dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTabNumber, setNewTabNumber] = useState('');
  const [newTabName, setNewTabName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Selected tab sheet
  const [selectedTab, setSelectedTab] = useState<Tab | null>(null);
  const [tabOrders, setTabOrders] = useState<Order[]>([]);
  
  // Edit tab dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editTabName, setEditTabName] = useState('');

  const fetchTabs = useCallback(async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('tabs')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('number');

      if (error) throw error;
      setTabs((data || []) as Tab[]);
    } catch (error) {
      console.error('Error fetching tabs:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    fetchTabs();
  }, [fetchTabs]);

  // Realtime subscription
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel('tabs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tabs',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => fetchTabs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id, fetchTabs]);

  const fetchTabOrders = async (tabId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, order_items (*)`)
        .eq('tab_id', tabId)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTabOrders(data || []);
    } catch (error) {
      console.error('Error fetching tab orders:', error);
    }
  };

  const handleTabClick = async (tab: Tab) => {
    setSelectedTab(tab);
    await fetchTabOrders(tab.id);
  };

  const handleCreateTab = async () => {
    if (!newTabNumber) return;

    setCreating(true);
    try {
      const { error } = await supabase.from('tabs').insert({
        restaurant_id: restaurant?.id,
        number: parseInt(newTabNumber),
        customer_name: newTabName || null,
        status: newTabName ? 'occupied' : 'available',
      });

      if (error) throw error;

      toast({ title: 'Comanda criada!' });
      setShowCreateDialog(false);
      setNewTabNumber('');
      setNewTabName('');
      fetchTabs();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar comanda',
        description: error.message,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateTabStatus = async (tabId: string, status: Tab['status']) => {
    try {
      const { error } = await supabase
        .from('tabs')
        .update({ status })
        .eq('id', tabId);

      if (error) throw error;
      fetchTabs();
      if (selectedTab?.id === tabId) {
        setSelectedTab({ ...selectedTab, status });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar comanda',
        description: error.message,
      });
    }
  };

  const handleUpdateTabName = async () => {
    if (!selectedTab) return;

    try {
      const { error } = await supabase
        .from('tabs')
        .update({ 
          customer_name: editTabName || null,
          status: editTabName ? 'occupied' : selectedTab.status,
        })
        .eq('id', selectedTab.id);

      if (error) throw error;
      
      toast({ title: 'Comanda atualizada!' });
      setShowEditDialog(false);
      setSelectedTab({ ...selectedTab, customer_name: editTabName || null });
      fetchTabs();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar comanda',
        description: error.message,
      });
    }
  };

  const filteredTabs = tabs.filter(tab => {
    const matchesSearch = !searchTerm || 
      tab.number.toString().includes(searchTerm) ||
      tab.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || tab.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusLabel = (status: Tab['status']) => {
    const labels = {
      available: 'Livre',
      occupied: 'Ocupada',
      closing: 'Fechando',
    };
    return labels[status];
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

  const getOrderStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      preparing: 'Em Preparo',
      ready: 'Pronto',
      delivered: 'Entregue',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Header Actions */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nº da comanda"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="available">Livre</SelectItem>
            <SelectItem value="occupied">Ocupada</SelectItem>
            <SelectItem value="closing">Fechando conta</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="w-4 h-4" />
            Criar comanda
          </Button>
        </div>
      </div>

      {/* Tabs Grid */}
      {tabs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Receipt className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium mb-2">Nenhuma comanda cadastrada</p>
          <p className="text-muted-foreground mb-4">Crie comandas para organizar pedidos individuais</p>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Criar Comanda
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <AnimatePresence>
            {filteredTabs.map((tab, index) => (
              <motion.div
                key={tab.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.02 }}
                className={`
                  bg-card border rounded-xl overflow-hidden cursor-pointer
                  hover:border-primary hover:shadow-md transition-all
                  ${tab.status === 'occupied' ? 'border-destructive/50' : ''}
                  ${tab.status === 'closing' ? 'border-warning/50' : ''}
                `}
                onClick={() => handleTabClick(tab)}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Comanda</p>
                      <p className="text-2xl font-bold">#{tab.number}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTab(tab);
                          onOpenOrderPOS(tab);
                        }}
                      >
                        <Plus className="w-3 h-3" />
                        Pedido
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  {tab.customer_name && (
                    <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {tab.customer_name}
                    </p>
                  )}
                </div>
                <div className={`
                  py-2 text-center text-sm font-medium
                  ${tab.status === 'available' ? 'bg-success/10 text-success' : ''}
                  ${tab.status === 'occupied' ? 'bg-destructive/10 text-destructive' : ''}
                  ${tab.status === 'closing' ? 'bg-warning/10 text-warning' : ''}
                `}>
                  {getStatusLabel(tab.status)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Tab Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Hash className="w-5 h-5" />
              Criar Comanda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Número da Comanda *</Label>
              <Input
                type="number"
                placeholder="Ex: 1"
                value={newTabNumber}
                onChange={(e) => setNewTabNumber(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nome do Cliente (opcional)</Label>
              <Input
                placeholder="Ex: João Silva"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                Se informado, a comanda será marcada como ocupada automaticamente
              </p>
            </div>
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleCreateTab}
              disabled={creating || !newTabNumber}
            >
              {creating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Criar Comanda'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tab Detail Sheet */}
      <Sheet open={!!selectedTab} onOpenChange={() => setSelectedTab(null)}>
        <SheetContent className="w-full sm:max-w-lg p-0">
          <SheetHeader className="p-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
            <SheetTitle className="flex items-center gap-3 text-xl">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-primary">#{selectedTab?.number}</span>
              </div>
              <div>
                <span className="block">Comanda #{selectedTab?.number}</span>
                {selectedTab?.customer_name && (
                  <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {selectedTab.customer_name}
                  </span>
                )}
                <span className={`status-badge ${selectedTab?.status} mt-1`}>
                  {selectedTab && getStatusLabel(selectedTab.status)}
                </span>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="p-6 space-y-6">
            {/* Edit Name Button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setEditTabName(selectedTab?.customer_name || '');
                setShowEditDialog(true);
              }}
            >
              <User className="w-4 h-4" />
              {selectedTab?.customer_name ? 'Alterar Nome' : 'Adicionar Nome'}
            </Button>

            {/* Status Actions */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Alterar Status</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={selectedTab?.status === 'available' ? 'default' : 'outline'}
                  className="h-12"
                  onClick={() => selectedTab && handleUpdateTabStatus(selectedTab.id, 'available')}
                >
                  Livre
                </Button>
                <Button
                  variant={selectedTab?.status === 'occupied' ? 'default' : 'outline'}
                  className="h-12"
                  onClick={() => selectedTab && handleUpdateTabStatus(selectedTab.id, 'occupied')}
                >
                  Ocupada
                </Button>
                <Button
                  variant={selectedTab?.status === 'closing' ? 'default' : 'outline'}
                  className="h-12"
                  onClick={() => selectedTab && handleUpdateTabStatus(selectedTab.id, 'closing')}
                >
                  Fechando
                </Button>
              </div>
            </div>

            {/* New Order Button */}
            <Button
              className="w-full gap-2 h-14 text-base font-semibold bg-success hover:bg-success/90 shadow-lg"
              onClick={() => selectedTab && onOpenOrderPOS(selectedTab)}
            >
              <ShoppingCart className="w-5 h-5" />
              Lançar Pedido
            </Button>

            {/* Close Tab Button */}
            {tabOrders.length > 0 && (
              <Button
                className="w-full gap-2 h-14 text-base font-semibold shadow-lg"
                variant="default"
              >
                <DollarSign className="w-5 h-5" />
                Fechar Comanda
              </Button>
            )}

            {/* Orders */}
            <div>
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-base">
                <Receipt className="w-5 h-5 text-primary" />
                Pedidos da Comanda
                {tabOrders.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {tabOrders.length} {tabOrders.length === 1 ? 'pedido' : 'pedidos'}
                  </Badge>
                )}
              </h3>
              <ScrollArea className="h-[280px]">
                {tabOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">
                      Nenhum pedido nesta comanda
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tabOrders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 bg-muted/50 rounded-xl space-y-3"
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
                          <div key={item.id} className="flex justify-between text-sm">
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
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Tab Name Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {selectedTab?.customer_name ? 'Alterar Nome' : 'Adicionar Nome'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nome do Cliente</Label>
              <Input
                placeholder="Ex: João Silva"
                value={editTabName}
                onChange={(e) => setEditTabName(e.target.value)}
                className="h-12"
              />
            </div>
            <Button
              className="w-full h-12 text-base font-semibold"
              onClick={handleUpdateTabName}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
