import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Clock, 
  Package, 
  Utensils,
  Truck,
  Store,
  BarChart3,
  Target,
  Download,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO, getHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useReportExport } from '@/hooks/useReportExport';

type Order = {
  id: string;
  created_at: string;
  total: number | null;
  status: string | null;
  order_type: string | null;
  customer_name: string | null;
  delivery_fee: number | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  created_at: string;
};

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(142 76% 36%)', 'hsl(38 92% 50%)', 'hsl(280 65% 60%)', 'hsl(199 89% 48%)'];

const Analytics = () => {
  const { restaurant } = useAuth();
  const { exportToExcel, exportToPDF } = useReportExport();
  const [period, setPeriod] = useState('7');

  const startDate = useMemo(() => {
    const days = parseInt(period);
    return startOfDay(subDays(new Date(), days - 1));
  }, [period]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['analytics-orders', restaurant?.id, period],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
    enabled: !!restaurant?.id,
  });

  const { data: orderItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['analytics-items', restaurant?.id, period],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!restaurant?.id,
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'ready' || o.status === 'preparing');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalDeliveryFees = completedOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
    const totalOrders = completedOrders.length;
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

    // Orders by type
    const tableOrders = completedOrders.filter(o => o.order_type === 'table').length;
    const counterOrders = completedOrders.filter(o => o.order_type === 'counter').length;
    const deliveryOrders = completedOrders.filter(o => o.order_type === 'delivery').length;

    return {
      totalRevenue,
      totalDeliveryFees,
      totalOrders,
      avgTicket,
      totalItems,
      tableOrders,
      counterOrders,
      deliveryOrders,
    };
  }, [orders, orderItems]);

  // Revenue by day chart
  const revenueByDay = useMemo(() => {
    const days = parseInt(period);
    const data: { date: string; revenue: number; orders: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const dayOrders = orders.filter(o => {
        const orderDate = parseISO(o.created_at);
        return isWithinInterval(orderDate, { start: dayStart, end: dayEnd }) &&
          (o.status === 'delivered' || o.status === 'ready' || o.status === 'preparing');
      });

      data.push({
        date: format(date, 'dd/MM', { locale: ptBR }),
        revenue: dayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        orders: dayOrders.length,
      });
    }

    return data;
  }, [orders, period]);

  // Orders by hour
  const ordersByHour = useMemo(() => {
    const hours: { [key: number]: number } = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;

    orders.forEach(order => {
      const hour = getHours(parseISO(order.created_at));
      hours[hour]++;
    });

    return Object.entries(hours).map(([hour, count]) => ({
      hour: `${hour}h`,
      pedidos: count,
    }));
  }, [orders]);

  // Top products
  const topProducts = useMemo(() => {
    const productMap: { [key: string]: { name: string; quantity: number; revenue: number } } = {};

    orderItems.forEach(item => {
      if (!productMap[item.product_name]) {
        productMap[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
      }
      productMap[item.product_name].quantity += item.quantity;
      productMap[item.product_name].revenue += item.product_price * item.quantity;
    });

    return Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [orderItems]);

  // Orders by type for pie chart
  const ordersByType = useMemo(() => {
    return [
      { name: 'Mesa', value: metrics.tableOrders, icon: Utensils },
      { name: 'Balcão', value: metrics.counterOrders, icon: Store },
      { name: 'Delivery', value: metrics.deliveryOrders, icon: Truck },
    ].filter(item => item.value > 0);
  }, [metrics]);

  const isLoading = ordersLoading || itemsLoading;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    const periodLabel = period === '7' ? '7 dias' : period === '14' ? '14 dias' : period === '30' ? '30 dias' : period === '60' ? '60 dias' : '90 dias';
    
    const options = {
      title: 'Relatório de Desempenho',
      subtitle: `Período: Últimos ${periodLabel} | Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
      filename: `desempenho-${new Date().toISOString().split('T')[0]}`,
      columns: [
        { header: 'Produto', key: 'name', width: 30 },
        { header: 'Quantidade', key: 'quantity', width: 15 },
        { header: 'Faturamento', key: 'revenue', width: 18 },
      ],
      data: topProducts.map(p => ({
        name: p.name,
        quantity: p.quantity,
        revenue: formatCurrency(p.revenue),
      })),
      summaryData: [
        { label: 'Faturamento Total', value: formatCurrency(metrics.totalRevenue) },
        { label: 'Total de Pedidos', value: String(metrics.totalOrders) },
        { label: 'Ticket Médio', value: formatCurrency(metrics.avgTicket) },
        { label: 'Itens Vendidos', value: String(metrics.totalItems) },
        { label: 'Pedidos Mesa', value: String(metrics.tableOrders) },
        { label: 'Pedidos Balcão', value: String(metrics.counterOrders) },
        { label: 'Pedidos Delivery', value: String(metrics.deliveryOrders) },
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
              <BarChart3 className="w-7 h-7 text-primary" />
              Meu Desempenho
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe as métricas do seu restaurante
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="14">Últimos 14 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>

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
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Faturamento Total</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {formatCurrency(metrics.totalRevenue)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        + {formatCurrency(metrics.totalDeliveryFees)} em taxas
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
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {metrics.totalOrders}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {metrics.totalItems} itens vendidos
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <ShoppingCart className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ticket Médio</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {formatCurrency(metrics.avgTicket)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        por pedido
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Target className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Itens/Pedido</p>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {metrics.totalOrders > 0 ? (metrics.totalItems / metrics.totalOrders).toFixed(1) : '0'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        média de itens
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Package className="w-6 h-6 text-orange-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Over Time */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Faturamento por Dia
                  </CardTitle>
                  <CardDescription>Evolução do faturamento no período</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueByDay}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          tickLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          tickLine={{ stroke: 'hsl(var(--border))' }}
                          tickFormatter={(value) => `R$${value}`}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          fill="url(#colorRevenue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Orders by Type */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Pedidos por Tipo
                  </CardTitle>
                  <CardDescription>Distribuição dos canais de venda</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ordersByType}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {ordersByType.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [value, 'Pedidos']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-4">
                    {ordersByType.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-muted-foreground">
                          {item.name}: {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Orders by Hour */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Horários de Pico
                  </CardTitle>
                  <CardDescription>Distribuição de pedidos por hora do dia</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ordersByHour}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="hour" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          tickLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [value, 'Pedidos']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar 
                          dataKey="pedidos" 
                          fill="hsl(var(--primary))" 
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Produtos Mais Vendidos
                  </CardTitle>
                  <CardDescription>Top 10 produtos por quantidade vendida</CardDescription>
                </CardHeader>
                <CardContent>
                  {topProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                      <Package className="w-12 h-12 mb-2 opacity-50" />
                      <p>Nenhum produto vendido no período</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {topProducts.map((product, index) => (
                        <div 
                          key={product.name} 
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {product.quantity} vendidos
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground">
                              {formatCurrency(product.revenue)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Utensils className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{metrics.tableOrders}</p>
                      <p className="text-sm text-muted-foreground">Pedidos de Mesa</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Store className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{metrics.counterOrders}</p>
                      <p className="text-sm text-muted-foreground">Pedidos de Balcão</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Truck className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{metrics.deliveryOrders}</p>
                      <p className="text-sm text-muted-foreground">Pedidos de Delivery</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
