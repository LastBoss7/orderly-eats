import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ScheduledOrdersPanel } from '@/components/dashboard/ScheduledOrdersPanel';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Clock, RefreshCw } from 'lucide-react';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Scheduled() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

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

  const handleStartOrder = async (orderId: string) => {
    await supabase
      .from('orders')
      .update({ status: 'preparing' })
      .eq('id', orderId);
    refetch();
  };

  const handleOpenDetails = (orderId: string) => {
    navigate(`/dashboard`);
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

  // Group orders by date
  const groupedOrders = scheduledOrders.reduce((acc: Record<string, any[]>, order) => {
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

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Pedidos Agendados</h1>
            </div>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-sm font-medium">
              {scheduledOrders.length}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : scheduledOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Clock className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum pedido agendado</p>
              <p className="text-sm">Os pedidos agendados aparecerão aqui</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {Object.entries(groupedOrders).map(([date, orders]) => (
                <div key={date} className="space-y-3">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide sticky top-0 bg-background py-2">
                    {formatDateHeader(date)} ({orders.length})
                  </h2>
                  <div className="grid gap-3">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleOpenDetails(order.id)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold">#{order.order_number}</span>
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
                            <div className="text-sm text-muted-foreground">
                              {order.order_items?.length || 0} {order.order_items?.length === 1 ? 'item' : 'itens'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-lg">
                              {formatCurrency(order.total || 0)}
                            </div>
                            {order.status === 'pending' && (
                              <Button
                                size="sm"
                                className="mt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartOrder(order.id);
                                }}
                              >
                                Iniciar
                              </Button>
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
