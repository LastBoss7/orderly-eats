import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useReportExport } from '@/hooks/useReportExport';
import { 
  Receipt, 
  Loader2, 
  Search,
  Calendar,
  DollarSign,
  CreditCard,
  Banknote,
  QrCode,
  TrendingUp,
  Users,
  Hash,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Eye,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  notes: string | null;
}

interface ClosedOrder {
  id: string;
  tab_id: string | null;
  table_id: string | null;
  total: number;
  status: string;
  payment_method: string | null;
  closed_at: string | null;
  created_at: string;
  split_mode: string | null;
  split_people: number | null;
  order_items?: OrderItem[];
  tabs?: { number: number; customer_name: string | null } | null;
  tables?: { number: number } | null;
}

type PeriodFilter = 'today' | 'week' | 'month' | 'custom';

const PAYMENT_COLORS: Record<string, string> = {
  cash: '#22c55e',
  credit: '#3b82f6',
  debit: '#8b5cf6',
  pix: '#06b6d4',
  mixed: '#f59e0b',
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  credit: 'Crédito',
  debit: 'Débito',
  pix: 'PIX',
  mixed: 'Múltiplos',
};

export default function TabHistory() {
  const { restaurant } = useAuth();
  const { exportToExcel, exportToPDF } = useReportExport();
  
  const [orders, setOrders] = useState<ClosedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('today');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ClosedOrder | null>(null);

  const getDateRange = useCallback(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (periodFilter) {
      case 'today':
        return { start: startOfDay, end: now };
      case 'week':
        const weekAgo = new Date(startOfDay);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { start: weekAgo, end: now };
      case 'month':
        const monthAgo = new Date(startOfDay);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { start: monthAgo, end: now };
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : startOfDay,
          end: customEndDate ? new Date(customEndDate + 'T23:59:59') : now,
        };
      default:
        return { start: startOfDay, end: now };
    }
  }, [periodFilter, customStartDate, customEndDate]);

  const fetchClosedOrders = useCallback(async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      const { start, end } = getDateRange();
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          tabs (number, customer_name),
          tables (number)
        `)
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'delivered')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      if (paymentFilter !== 'all') {
        query = query.eq('payment_method', paymentFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders((data || []) as ClosedOrder[]);
    } catch (error) {
      console.error('Error fetching closed orders:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurant?.id, getDateRange, paymentFilter]);

  useEffect(() => {
    fetchClosedOrders();
  }, [fetchClosedOrders]);

  // Filter orders by search term
  const filteredOrders = orders.filter(order => {
    if (!searchTerm) return true;
    const tabNumber = order.tabs?.number?.toString() || '';
    const tableNumber = order.tables?.number?.toString() || '';
    const customerName = order.tabs?.customer_name?.toLowerCase() || '';
    return (
      tabNumber.includes(searchTerm) ||
      tableNumber.includes(searchTerm) ||
      customerName.includes(searchTerm.toLowerCase())
    );
  });

  // Calculate statistics
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalOrders = filteredOrders.length;
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Payment method breakdown
  const paymentBreakdown = filteredOrders.reduce((acc, order) => {
    const method = order.payment_method || 'unknown';
    if (!acc[method]) {
      acc[method] = { count: 0, total: 0 };
    }
    acc[method].count++;
    acc[method].total += order.total || 0;
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const paymentChartData = Object.entries(paymentBreakdown)
    .filter(([key]) => key !== 'unknown')
    .map(([key, value]) => ({
      name: PAYMENT_LABELS[key] || key,
      value: value.total,
      count: value.count,
      color: PAYMENT_COLORS[key] || '#94a3b8',
    }));

  // Daily revenue breakdown
  const dailyRevenue = filteredOrders.reduce((acc, order) => {
    const date = new Date(order.created_at).toLocaleDateString('pt-BR');
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date] += order.total || 0;
    return acc;
  }, {} as Record<string, number>);

  const dailyChartData = Object.entries(dailyRevenue)
    .map(([date, total]) => ({ date, total }))
    .reverse()
    .slice(-7);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentIcon = (method: string | null) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4" />;
      case 'credit': return <CreditCard className="w-4 h-4" />;
      case 'debit': return <CreditCard className="w-4 h-4" />;
      case 'pix': return <QrCode className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    const exportData = filteredOrders.map(order => ({
      data: formatDateTime(order.created_at),
      tipo: order.tab_id ? `Comanda #${order.tabs?.number}` : `Mesa ${order.tables?.number}`,
      cliente: order.tabs?.customer_name || '-',
      total: formatCurrency(order.total),
      pagamento: PAYMENT_LABELS[order.payment_method || ''] || '-',
    }));

    const columns = [
      { header: 'Data', key: 'data', width: 20 },
      { header: 'Tipo', key: 'tipo', width: 18 },
      { header: 'Cliente', key: 'cliente', width: 25 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Pagamento', key: 'pagamento', width: 15 },
    ];

    const options = {
      title: 'Histórico de Vendas',
      subtitle: `Período: ${periodFilter === 'today' ? 'Hoje' : periodFilter === 'week' ? 'Última semana' : periodFilter === 'month' ? 'Último mês' : 'Personalizado'}`,
      filename: 'historico-vendas',
      columns,
      data: exportData,
      summaryData: [
        { label: 'Total Faturado', value: formatCurrency(totalRevenue) },
        { label: 'Pedidos', value: totalOrders.toString() },
        { label: 'Ticket Médio', value: formatCurrency(averageTicket) },
      ],
    };

    if (format === 'excel') {
      exportToExcel(options);
    } else {
      exportToPDF(options);
    }
  };

  return (
    <DashboardLayout>
      <div className="page-container animate-fade-in">
        {/* Header */}
        <div className="page-header mb-6">
          <div>
            <h1 className="page-title">Histórico de Vendas</h1>
            <p className="page-description">
              Comandas e mesas fechadas com relatório por período
            </p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('excel')} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="gap-2">
                <FileText className="w-4 h-4" />
                Exportar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {periodFilter === 'custom' && (
            <>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-[160px]"
              />
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-[160px]"
              />
            </>
          )}

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cash">Dinheiro</SelectItem>
              <SelectItem value="credit">Crédito</SelectItem>
              <SelectItem value="debit">Débito</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="mixed">Múltiplos</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar comanda, mesa ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos Fechados</p>
                  <p className="text-2xl font-bold">{totalOrders}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold">{formatCurrency(averageTicket)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Faturamento por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis 
                      tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Formas de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {paymentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Total']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {Object.entries(PAYMENT_LABELS).map(([key, label]) => {
            const data = paymentBreakdown[key] || { count: 0, total: 0 };
            return (
              <Card key={key} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${PAYMENT_COLORS[key]}20` }}
                    >
                      {getPaymentIcon(key)}
                    </div>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <p className="text-lg font-bold">{formatCurrency(data.total)}</p>
                  <p className="text-xs text-muted-foreground">{data.count} vendas</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Comandas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Receipt className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium">Nenhum pedido encontrado</p>
                <p className="text-muted-foreground">Ajuste os filtros para ver mais resultados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Data/Hora</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Cliente</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Itens</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Pagamento</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Total</th>
                      <th className="text-center p-4 text-sm font-medium text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {formatDateTime(order.created_at)}
                          </div>
                        </td>
                        <td className="p-4">
                          {order.tab_id ? (
                            <Badge variant="outline" className="gap-1">
                              <Hash className="w-3 h-3" />
                              Comanda #{order.tabs?.number}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              Mesa {order.tables?.number}
                            </Badge>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-sm">
                            {order.tabs?.customer_name || '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-muted-foreground">
                            {order.order_items?.length || 0} itens
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {getPaymentIcon(order.payment_method)}
                            <span className="text-sm">
                              {PAYMENT_LABELS[order.payment_method || ''] || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-semibold">{formatCurrency(order.total)}</span>
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Detail Sheet */}
        <Sheet open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <SheetContent className="w-full sm:max-w-lg p-0">
            <SheetHeader className="p-6 pb-4 border-b">
              <SheetTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div>
                  {selectedOrder?.tab_id ? (
                    <span>Comanda #{selectedOrder.tabs?.number}</span>
                  ) : (
                    <span>Mesa {selectedOrder?.tables?.number}</span>
                  )}
                  <p className="text-sm font-normal text-muted-foreground">
                    {selectedOrder && formatDateTime(selectedOrder.created_at)}
                  </p>
                </div>
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 p-6">
              {selectedOrder && (
                <div className="space-y-6">
                  {/* Total */}
                  <div className="bg-gradient-to-br from-primary/10 to-transparent rounded-xl p-5 border border-primary/20">
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-3xl font-bold">{formatCurrency(selectedOrder.total)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getPaymentIcon(selectedOrder.payment_method)}
                      <span className="text-sm">
                        {PAYMENT_LABELS[selectedOrder.payment_method || ''] || 'Não informado'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  {selectedOrder.tabs?.customer_name && (
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Cliente</p>
                        <p className="font-medium">{selectedOrder.tabs.customer_name}</p>
                      </div>
                    </div>
                  )}

                  {/* Split Info */}
                  {selectedOrder.split_mode && selectedOrder.split_mode !== 'none' && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                      <Users className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Divisão</p>
                        <p className="font-medium">
                          {selectedOrder.split_mode === 'equal' 
                            ? `Dividido por ${selectedOrder.split_people} pessoas`
                            : 'Dividido por item'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  <div>
                    <h3 className="font-semibold mb-4">Itens do Pedido</h3>
                    <div className="space-y-3">
                      {selectedOrder.order_items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-start p-3 bg-card rounded-lg border">
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity}x {formatCurrency(item.product_price)}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-warning mt-1">{item.notes}</p>
                            )}
                          </div>
                          <p className="font-semibold">
                            {formatCurrency(item.product_price * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
