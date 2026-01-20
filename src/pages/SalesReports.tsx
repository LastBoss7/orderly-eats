import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { 
  CreditCard,
  DollarSign, 
  Users, 
  Download,
  FileSpreadsheet,
  FileText,
  Banknote,
  QrCode,
  Wallet,
  Receipt,
} from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useReportExport } from '@/hooks/useReportExport';

type Order = {
  id: string;
  created_at: string;
  total: number | null;
  status: string | null;
  order_type: string | null;
  payment_method: string | null;
  waiter_id: string | null;
};

type TabPayment = {
  id: string;
  tab_id: string;
  payment_method: string;
  amount: number;
  cash_received: number | null;
  change_given: number | null;
  created_at: string;
};

type Waiter = {
  id: string;
  name: string;
};

const COLORS = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(38 92% 50%)', 'hsl(280 65% 60%)', 'hsl(199 89% 48%)', 'hsl(0 72% 51%)'];

const PERIOD_OPTIONS = [
  { value: '1', label: 'Hoje' },
  { value: '3', label: 'Últimos 3 dias' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '14', label: 'Últimos 14 dias' },
  { value: '31', label: 'Últimos 31 dias' },
];

const PAYMENT_LABELS: Record<string, string> = {
  'cash': 'Dinheiro',
  'credit': 'Crédito',
  'debit': 'Débito',
  'pix': 'PIX',
  'mixed': 'Misto',
  'Não informado': 'Não informado',
};

const PAYMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'cash': Banknote,
  'credit': CreditCard,
  'debit': CreditCard,
  'pix': QrCode,
  'mixed': Wallet,
};

const SalesReports = () => {
  const { restaurant } = useAuth();
  const { exportToExcel, exportToPDF } = useReportExport();
  const [period, setPeriod] = useState('7');
  const [activeTab, setActiveTab] = useState('payment');

  const periodDays = parseInt(period);
  const startDate = useMemo(() => startOfDay(subDays(new Date(), periodDays - 1)), [periodDays]);

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['sales-orders', restaurant?.id, period],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', startDate.toISOString())
        .in('status', ['delivered', 'ready', 'preparing'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!restaurant?.id,
  });

  // Fetch tab payments (for mixed payments)
  const { data: tabPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['tab-payments', restaurant?.id, period],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const { data, error } = await supabase
        .from('tab_payments')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TabPayment[];
    },
    enabled: !!restaurant?.id,
  });

  // Fetch waiters
  const { data: waiters = [] } = useQuery({
    queryKey: ['waiters', restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const { data, error } = await supabase
        .from('waiters')
        .select('id, name')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'active');

      if (error) throw error;
      return data as Waiter[];
    },
    enabled: !!restaurant?.id,
  });

  // Calculate payment method breakdown (including mixed payments)
  const paymentMethodsData = useMemo(() => {
    const methodTotals: Record<string, { count: number; amount: number }> = {};

    // Process regular orders
    orders.forEach(order => {
      const method = order.payment_method || 'Não informado';
      if (!methodTotals[method]) {
        methodTotals[method] = { count: 0, amount: 0 };
      }
      
      // For mixed payments, we count the order but don't add to amount (will be in tab_payments)
      if (method === 'mixed') {
        methodTotals[method].count++;
      } else {
        methodTotals[method].count++;
        methodTotals[method].amount += order.total || 0;
      }
    });

    // Process tab payments for mixed payments breakdown
    tabPayments.forEach(payment => {
      const method = payment.payment_method || 'Não informado';
      if (!methodTotals[method]) {
        methodTotals[method] = { count: 0, amount: 0 };
      }
      methodTotals[method].amount += payment.amount;
    });

    const result = Object.entries(methodTotals)
      .map(([method, data]) => ({
        method,
        label: PAYMENT_LABELS[method] || method,
        count: data.count,
        amount: data.amount,
      }))
      .filter(item => item.amount > 0 || item.count > 0)
      .sort((a, b) => b.amount - a.amount);

    const totalAmount = result.reduce((sum, item) => sum + item.amount, 0);
    return result.map(item => ({
      ...item,
      percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0,
    }));
  }, [orders, tabPayments]);

  // Calculate waiter sales
  const waiterSalesData = useMemo(() => {
    const waiterTotals: Record<string, { name: string; count: number; amount: number }> = {};

    orders.forEach(order => {
      if (order.waiter_id) {
        const waiter = waiters.find(w => w.id === order.waiter_id);
        const waiterId = order.waiter_id;
        
        if (!waiterTotals[waiterId]) {
          waiterTotals[waiterId] = {
            name: waiter?.name || 'Garçom Desconhecido',
            count: 0,
            amount: 0,
          };
        }
        waiterTotals[waiterId].count++;
        waiterTotals[waiterId].amount += order.total || 0;
      }
    });

    const result = Object.entries(waiterTotals)
      .map(([id, data]) => ({
        id,
        name: data.name,
        count: data.count,
        amount: data.amount,
        avgTicket: data.count > 0 ? data.amount / data.count : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const totalAmount = result.reduce((sum, item) => sum + item.amount, 0);
    const maxAmount = result.length > 0 ? result[0].amount : 1;
    
    return result.map(item => ({
      ...item,
      percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0,
      progressPercentage: (item.amount / maxAmount) * 100,
    }));
  }, [orders, waiters]);

  // Summary metrics
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const ordersWithWaiter = orders.filter(o => o.waiter_id).length;

    return {
      totalOrders,
      totalRevenue,
      avgTicket,
      ordersWithWaiter,
      uniqueWaiters: waiterSalesData.length,
    };
  }, [orders, waiterSalesData]);

  const isLoading = ordersLoading || paymentsLoading;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleExportPaymentMethods = (format: 'excel' | 'pdf') => {
    const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || '';
    
    const options = {
      title: 'Relatório de Vendas por Forma de Pagamento',
      subtitle: `Período: ${periodLabel} | Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      filename: `vendas-pagamento-${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: 'Forma de Pagamento', key: 'label', width: 25 },
        { header: 'Qtd. Pedidos', key: 'count', width: 15 },
        { header: 'Valor Total', key: 'amount', width: 18 },
        { header: 'Participação', key: 'percentage', width: 15 },
      ],
      data: paymentMethodsData.map(p => ({
        label: p.label,
        count: p.count,
        amount: formatCurrency(p.amount),
        percentage: `${p.percentage.toFixed(1)}%`,
      })),
      summaryData: [
        { label: 'Faturamento Total', value: formatCurrency(metrics.totalRevenue) },
        { label: 'Total de Pedidos', value: String(metrics.totalOrders) },
        { label: 'Ticket Médio', value: formatCurrency(metrics.avgTicket) },
      ],
    };

    if (format === 'excel') {
      exportToExcel(options);
    } else {
      exportToPDF(options);
    }
  };

  const handleExportWaiterSales = (format: 'excel' | 'pdf') => {
    const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || '';
    
    const options = {
      title: 'Relatório de Vendas por Garçom',
      subtitle: `Período: ${periodLabel} | Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      filename: `vendas-garcom-${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: 'Garçom', key: 'name', width: 25 },
        { header: 'Qtd. Pedidos', key: 'count', width: 15 },
        { header: 'Valor Total', key: 'amount', width: 18 },
        { header: 'Ticket Médio', key: 'avgTicket', width: 18 },
        { header: 'Participação', key: 'percentage', width: 15 },
      ],
      data: waiterSalesData.map(w => ({
        name: w.name,
        count: w.count,
        amount: formatCurrency(w.amount),
        avgTicket: formatCurrency(w.avgTicket),
        percentage: `${w.percentage.toFixed(1)}%`,
      })),
      summaryData: [
        { label: 'Faturamento Total', value: formatCurrency(metrics.totalRevenue) },
        { label: 'Pedidos com Garçom', value: String(metrics.ordersWithWaiter) },
        { label: 'Garçons Ativos', value: String(metrics.uniqueWaiters) },
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
      <div className="p-6 space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-7 h-7 text-primary" />
              Relatórios de Vendas
            </h1>
            <p className="text-muted-foreground mt-1">
              Análise por forma de pagamento e por garçom
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Faturamento Total</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(metrics.totalRevenue)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                  <p className="text-2xl font-bold text-foreground">
                    {metrics.totalOrders}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(metrics.avgTicket)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-64 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
              <TabsTrigger value="payment" className="gap-2">
                <CreditCard className="w-4 h-4" />
                <span>Formas de Pagamento</span>
              </TabsTrigger>
              <TabsTrigger value="waiter" className="gap-2">
                <Users className="w-4 h-4" />
                <span>Por Garçom</span>
              </TabsTrigger>
            </TabsList>

            {/* Payment Methods Tab */}
            <TabsContent value="payment" className="space-y-6">
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Download className="w-4 h-4" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExportPaymentMethods('excel')} className="gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Exportar Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportPaymentMethods('pdf')} className="gap-2">
                      <FileText className="w-4 h-4" />
                      Exportar PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Distribuição por Forma de Pagamento</CardTitle>
                    <CardDescription>Participação de cada método no faturamento</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {paymentMethodsData.length === 0 ? (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Nenhum dado disponível para o período selecionado
                      </div>
                    ) : (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={paymentMethodsData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={5}
                              dataKey="amount"
                              nameKey="label"
                            >
                              {paymentMethodsData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number) => [formatCurrency(value), 'Valor']}
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                      {paymentMethodsData.map((item, index) => {
                        const Icon = PAYMENT_ICONS[item.method] || CreditCard;
                        return (
                          <div key={item.method} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Detalhamento por Forma de Pagamento</CardTitle>
                    <CardDescription>Valores e quantidades por método</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {paymentMethodsData.length === 0 ? (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Nenhum dado disponível para o período selecionado
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Método</TableHead>
                            <TableHead className="text-right">Pedidos</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-right">%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentMethodsData.map((item, index) => {
                            const Icon = PAYMENT_ICONS[item.method] || CreditCard;
                            return (
                              <TableRow key={item.method}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-2 h-2 rounded-full" 
                                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    />
                                    <Icon className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">{item.label}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{item.count}</TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(item.amount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary">{item.percentage.toFixed(1)}%</Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Waiter Sales Tab */}
            <TabsContent value="waiter" className="space-y-6">
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Download className="w-4 h-4" />
                      Exportar
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExportWaiterSales('excel')} className="gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      Exportar Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportWaiterSales('pdf')} className="gap-2">
                      <FileText className="w-4 h-4" />
                      Exportar PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Faturamento por Garçom</CardTitle>
                    <CardDescription>Comparativo de vendas entre garçons</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {waiterSalesData.length === 0 ? (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Nenhum pedido com garçom no período selecionado
                      </div>
                    ) : (
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={waiterSalesData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis 
                              type="number" 
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                              tickFormatter={(value) => `R$${value}`}
                            />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              width={100}
                              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            />
                            <Tooltip 
                              formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                            <Bar 
                              dataKey="amount" 
                              fill="hsl(var(--primary))" 
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Ranking de Vendas por Garçom</CardTitle>
                    <CardDescription>Desempenho individual de cada garçom</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {waiterSalesData.length === 0 ? (
                      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                        Nenhum pedido com garçom no período selecionado
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {waiterSalesData.map((waiter, index) => (
                          <div key={waiter.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={index === 0 ? 'default' : 'secondary'} className="w-6 h-6 p-0 justify-center">
                                  {index + 1}
                                </Badge>
                                <span className="font-medium">{waiter.name}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">{formatCurrency(waiter.amount)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {waiter.count} pedidos • Ticket: {formatCurrency(waiter.avgTicket)}
                                </p>
                              </div>
                            </div>
                            <Progress value={waiter.progressPercentage} className="h-2" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SalesReports;
