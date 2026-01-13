import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format, subDays, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Search, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp,
  Printer,
  Eye,
  FileText,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  XCircle
} from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type PeriodFilter = 'today' | 'week' | 'month' | 'last_month' | 'all';

interface PaymentData {
  count: number;
  total: number;
}

interface DailyClosing {
  id: string;
  closing_date: string;
  total_revenue: number;
  total_orders: number;
  average_ticket: number;
  cancelled_orders: number;
  payment_breakdown: Record<string, PaymentData> | null;
  order_type_breakdown: Record<string, PaymentData> | null;
  notes: string | null;
  created_at: string;
}

const PAYMENT_COLORS: Record<string, string> = {
  pix: '#00D4AA',
  credit: '#8B5CF6',
  debit: '#3B82F6',
  cash: '#10B981',
  voucher: '#F59E0B',
};

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit: 'Crédito',
  debit: 'Débito',
  cash: 'Dinheiro',
  voucher: 'Vale Refeição',
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  counter: 'Balcão',
  table: 'Mesa',
  delivery: 'Delivery',
  takeaway: 'Para Levar',
};

export default function ClosingHistory() {
  const { profile } = useAuth();
  const [closings, setClosings] = useState<DailyClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClosing, setSelectedClosing] = useState<DailyClosing | null>(null);
  const { exportToExcel, exportToPDF } = useReportExport();

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchClosings();
    }
  }, [profile?.restaurant_id, periodFilter]);

  const getDateRange = () => {
    const now = new Date();
    switch (periodFilter) {
      case 'today':
        return { start: format(now, 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'week':
        return { start: format(subDays(now, 7), 'yyyy-MM-dd'), end: format(now, 'yyyy-MM-dd') };
      case 'month':
        return { start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfMonth(now), 'yyyy-MM-dd') };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), end: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
      default:
        return null;
    }
  };

  const fetchClosings = async () => {
    if (!profile?.restaurant_id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('daily_closings')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('closing_date', { ascending: false });

      const dateRange = getDateRange();
      if (dateRange) {
        query = query.gte('closing_date', dateRange.start).lte('closing_date', dateRange.end);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: DailyClosing[] = (data || []).map((item) => ({
        id: item.id,
        closing_date: item.closing_date,
        total_revenue: item.total_revenue,
        total_orders: item.total_orders,
        average_ticket: item.average_ticket,
        cancelled_orders: item.cancelled_orders,
        payment_breakdown: item.payment_breakdown as unknown as Record<string, PaymentData> | null,
        order_type_breakdown: item.order_type_breakdown as unknown as Record<string, PaymentData> | null,
        notes: item.notes,
        created_at: item.created_at,
      }));
      
      setClosings(transformedData);
    } catch (error) {
      console.error('Error fetching closings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'pix': return <Smartphone className="h-4 w-4" />;
      case 'credit': return <CreditCard className="h-4 w-4" />;
      case 'debit': return <CreditCard className="h-4 w-4" />;
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'voucher': return <Receipt className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  // Calculate summary statistics
  const totalRevenue = closings.reduce((sum, c) => sum + Number(c.total_revenue), 0);
  const totalOrders = closings.reduce((sum, c) => sum + c.total_orders, 0);
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalCancelledOrders = closings.reduce((sum, c) => sum + c.cancelled_orders, 0);

  // Prepare chart data
  const chartData = closings.slice(0, 30).reverse().map(c => ({
    date: format(parseISO(c.closing_date), 'dd/MM'),
    revenue: Number(c.total_revenue),
    orders: c.total_orders,
  }));

  // Aggregate payment data
  const aggregatedPayments: Record<string, { count: number; total: number }> = {};
  closings.forEach(c => {
    Object.entries(c.payment_breakdown || {}).forEach(([method, data]) => {
      if (!aggregatedPayments[method]) {
        aggregatedPayments[method] = { count: 0, total: 0 };
      }
      aggregatedPayments[method].count += (data as { count: number; total: number }).count;
      aggregatedPayments[method].total += (data as { count: number; total: number }).total;
    });
  });

  const pieData = Object.entries(aggregatedPayments).map(([method, data]) => ({
    name: PAYMENT_LABELS[method] || method,
    value: data.total,
    count: data.count,
    color: PAYMENT_COLORS[method] || '#94A3B8',
  }));

  const filteredClosings = closings.filter(c => 
    formatDate(c.closing_date).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExport = (type: 'excel' | 'pdf') => {
    const exportData = filteredClosings.map(c => ({
      data: formatDate(c.closing_date),
      pedidos: c.total_orders,
      cancelados: c.cancelled_orders,
      ticketMedio: formatCurrency(c.average_ticket),
      faturamento: formatCurrency(Number(c.total_revenue)),
    }));

    const columns = [
      { header: 'Data', key: 'data', width: 30 },
      { header: 'Pedidos', key: 'pedidos', width: 15 },
      { header: 'Cancelados', key: 'cancelados', width: 15 },
      { header: 'Ticket Médio', key: 'ticketMedio', width: 20 },
      { header: 'Faturamento', key: 'faturamento', width: 20 },
    ];

    const options = {
      title: 'Histórico de Fechamentos',
      subtitle: `Período: ${periodFilter === 'all' ? 'Todos' : periodFilter}`,
      filename: `historico-fechamentos-${format(new Date(), 'yyyy-MM-dd')}`,
      columns,
      data: exportData,
      summaryData: [
        { label: 'Total de Fechamentos', value: filteredClosings.length.toString() },
        { label: 'Faturamento Total', value: formatCurrency(totalRevenue) },
        { label: 'Total de Pedidos', value: totalOrders.toString() },
        { label: 'Ticket Médio Geral', value: formatCurrency(averageTicket) },
      ],
    };

    if (type === 'excel') {
      exportToExcel(options);
    } else {
      exportToPDF(options);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Histórico de Fechamentos</h1>
            <p className="text-muted-foreground">Visualize o histórico de fechamentos de caixa</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport('excel')}>
              <FileText className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf')}>
              <Printer className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
            <SelectTrigger className="w-full md:w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Últimos 7 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="last_month">Mês passado</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento Total</p>
                  <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <ShoppingBag className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                  <p className="text-xl font-bold">{totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-xl font-bold">{formatCurrency(averageTicket)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cancelados</p>
                  <p className="text-xl font-bold">{totalCancelledOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {closings.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Faturamento por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => `Data: ${label}`}
                      />
                      <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Formas de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground">Sem dados de pagamento</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {pieData.map((entry, index) => (
                    <Badge key={index} variant="outline" className="gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                      {entry.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Closings Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fechamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filteredClosings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum fechamento encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-center">Pedidos</TableHead>
                      <TableHead className="text-center">Cancelados</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClosings.map((closing) => (
                      <TableRow key={closing.id}>
                        <TableCell className="font-medium">
                          {formatDate(closing.closing_date)}
                        </TableCell>
                        <TableCell className="text-center">{closing.total_orders}</TableCell>
                        <TableCell className="text-center">
                          {closing.cancelled_orders > 0 ? (
                            <Badge variant="destructive">{closing.cancelled_orders}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(closing.average_ticket)}</TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(Number(closing.total_revenue))}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedClosing(closing)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Sheet */}
        <Sheet open={!!selectedClosing} onOpenChange={() => setSelectedClosing(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>
                Detalhes do Fechamento
              </SheetTitle>
            </SheetHeader>
            
            {selectedClosing && (
              <div className="mt-6 space-y-6">
                <div className="text-center">
                  <p className="text-lg font-semibold">{formatDate(selectedClosing.closing_date)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Faturamento</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(Number(selectedClosing.total_revenue))}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Pedidos</p>
                      <p className="text-2xl font-bold">{selectedClosing.total_orders}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Ticket Médio</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(selectedClosing.average_ticket)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-muted-foreground">Cancelados</p>
                      <p className="text-xl font-bold text-red-500">
                        {selectedClosing.cancelled_orders}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Breakdown */}
                <div>
                  <h4 className="font-semibold mb-3">Formas de Pagamento</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedClosing.payment_breakdown || {}).map(([method, data]) => {
                      const paymentData = data as { count: number; total: number };
                      return (
                        <div key={method} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            {getPaymentIcon(method)}
                            <span>{PAYMENT_LABELS[method] || method}</span>
                            <Badge variant="secondary">{paymentData.count}x</Badge>
                          </div>
                          <span className="font-bold">{formatCurrency(paymentData.total)}</span>
                        </div>
                      );
                    })}
                    {Object.keys(selectedClosing.payment_breakdown || {}).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        Sem dados de pagamento
                      </p>
                    )}
                  </div>
                </div>

                {/* Order Type Breakdown */}
                <div>
                  <h4 className="font-semibold mb-3">Tipos de Pedido</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedClosing.order_type_breakdown || {}).map(([type, data]) => {
                      const typeData = data as { count: number; total: number };
                      return (
                        <div key={type} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span>{ORDER_TYPE_LABELS[type] || type}</span>
                            <Badge variant="secondary">{typeData.count}x</Badge>
                          </div>
                          <span className="font-bold">{formatCurrency(typeData.total)}</span>
                        </div>
                      );
                    })}
                    {Object.keys(selectedClosing.order_type_breakdown || {}).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        Sem dados de tipo de pedido
                      </p>
                    )}
                  </div>
                </div>

                {selectedClosing.notes && (
                  <div>
                    <h4 className="font-semibold mb-2">Observações</h4>
                    <p className="text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedClosing.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </DashboardLayout>
  );
}
