import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Calendar as CalendarIcon, Clock, RefreshCw, Filter, Play, Check, X } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'pending' | 'preparing';

export default function Scheduled() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRestaurantId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('restaurant_id')
        .eq('user_id', user.id)
        .single();
      if (data) setRestaurantId(data.restaurant_id);
    };
    fetchRestaurantId();
  }, [user]);

  const { data: scheduledOrders = [], isLoading, refetch } = useQuery({
    queryKey: ['scheduled-orders', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            product_price,
            quantity,
            notes,
            product_size
          ),
          tables (number),
          tabs (number, customer_name)
        `)
        .eq('restaurant_id', restaurantId)
        .not('scheduled_at', 'is', null)
        .in('status', ['pending', 'preparing'])
        .order('scheduled_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  // Filter orders by date and status
  const filteredOrders = scheduledOrders.filter((order) => {
    // Status filter
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }
    
    // Date filter
    if (dateFilter && order.scheduled_at) {
      const orderDate = parseISO(order.scheduled_at);
      if (!isSameDay(orderDate, dateFilter)) {
        return false;
      }
    }
    
    return true;
  });

  const confirmOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // Update order to preparing status and mark print_status as pending
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'preparing',
          print_status: 'pending' // This will trigger automatic printing
        })
        .eq('id', orderId);
      
      if (error) throw error;
      return orderId;
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Pedido confirmado! Enviando para impressão...');
      setConfirmingOrderId(null);
      // Navigate to dashboard after confirmation
      navigate('/dashboard');
    },
    onError: (error) => {
      console.error('Error confirming order:', error);
      toast.error('Erro ao confirmar pedido');
      setConfirmingOrderId(null);
    }
  });

  const handleConfirmOrder = (orderId: string) => {
    setConfirmingOrderId(orderId);
  };

  const handleConfirmYes = (orderId: string) => {
    confirmOrderMutation.mutate(orderId);
  };

  const handleConfirmNo = () => {
    setConfirmingOrderId(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getLocationInfo = (order: any) => {
    if (order.tables?.number) return `Mesa ${order.tables.number}`;
    if (order.tabs?.number) return `Comanda ${order.tabs.number}`;
    return null;
  };

  const getOrderTypeLabel = (order: any) => {
    switch (order.order_type) {
      case 'delivery': return 'Delivery';
      case 'takeaway': return 'Retirada';
      case 'table': return 'Mesa';
      case 'tab': return 'Comanda';
      default: return 'Balcão';
    }
  };

  // Group orders by date
  const groupedOrders = filteredOrders.reduce((acc: Record<string, any[]>, order) => {
    const date = order.scheduled_at ? format(parseISO(order.scheduled_at), 'yyyy-MM-dd') : 'sem-data';
    if (!acc[date]) acc[date] = [];
    acc[date].push(order);
    return acc;
  }, {});

  const formatDateHeader = (dateStr: string) => {
    if (dateStr === 'sem-data') return 'Sem data definida';
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  };

  const clearFilters = () => {
    setDateFilter(undefined);
    setStatusFilter('all');
  };

  const hasActiveFilters = dateFilter !== undefined || statusFilter !== 'all';

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex flex-col gap-4 p-4 border-b bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold">Pedidos Agendados</h1>
              </div>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-sm font-medium">
                {filteredOrders.length}
                {filteredOrders.length !== scheduledOrders.length && (
                  <span className="text-muted-foreground ml-1">/ {scheduledOrders.length}</span>
                )}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filtros:</span>
            </div>

            {/* Date Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "justify-start text-left font-normal",
                    dateFilter && "bg-primary/10 border-primary"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? format(dateFilter, "dd/MM/yyyy") : "Data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className={cn(
                "w-[140px]",
                statusFilter !== 'all' && "bg-primary/10 border-primary"
              )}>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="preparing">Preparando</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {hasActiveFilters ? 'Nenhum pedido encontrado' : 'Nenhum pedido agendado'}
              </p>
              <p className="text-sm">
                {hasActiveFilters ? 'Tente ajustar os filtros' : 'Os pedidos agendados aparecerão aqui'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {Object.entries(groupedOrders).map(([date, orders]) => (
                <div key={date} className="space-y-3">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide sticky top-0 bg-background py-2 z-10">
                    {formatDateHeader(date)} ({orders.length})
                  </h2>
                  <div className="grid gap-3">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-semibold">#{order.order_number}</span>
                              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                {getOrderTypeLabel(order)}
                              </span>
                              {order.customer_name && (
                                <span className="text-muted-foreground">• {order.customer_name}</span>
                              )}
                              {getLocationInfo(order) && (
                                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                  {getLocationInfo(order)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Clock className="h-4 w-4" />
                              <span>
                                {order.scheduled_at && format(parseISO(order.scheduled_at), "HH:mm", { locale: ptBR })}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${
                                order.status === 'preparing' 
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {order.status === 'preparing' ? 'Preparando' : 'Pendente'}
                              </span>
                            </div>
                            {order.order_items && order.order_items.length > 0 && (
                              <div className="text-sm text-muted-foreground space-y-0.5">
                                {order.order_items.slice(0, 3).map((item: any) => (
                                  <div key={item.id} className="truncate">
                                    {item.quantity}x {item.product_name}
                                    {item.product_size && ` (${item.product_size})`}
                                  </div>
                                ))}
                                {order.order_items.length > 3 && (
                                  <div className="text-xs italic">
                                    +{order.order_items.length - 3} mais itens
                                  </div>
                                )}
                              </div>
                            )}
                            {order.notes && (
                              <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                                📝 {order.notes}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <div className="font-semibold text-lg">
                              {formatCurrency(order.total || 0)}
                            </div>
                            {order.status === 'pending' && (
                              <>
                                {confirmingOrderId === order.id ? (
                                  <div className="flex flex-col gap-2 items-end">
                                    <span className="text-sm text-muted-foreground">Confirmar?</span>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleConfirmNo()}
                                        disabled={confirmOrderMutation.isPending}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => handleConfirmYes(order.id)}
                                        disabled={confirmOrderMutation.isPending}
                                      >
                                        <Check className="h-4 w-4 mr-1" />
                                        Sim
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleConfirmOrder(order.id)}
                                  >
                                    <Play className="h-4 w-4 mr-1" />
                                    Confirmar
                                  </Button>
                                )}
                              </>
                            )}
                            {order.status === 'preparing' && (
                              <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Em preparo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
