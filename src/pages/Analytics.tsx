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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart, Legend } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown,
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
  Calendar,
  Flame,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO, getHours, getDay } from 'date-fns';
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
  payment_method: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  created_at: string;
};

const COLORS = ['hsl(var(--primary))', 'hsl(142 76% 36%)', 'hsl(38 92% 50%)', 'hsl(280 65% 60%)', 'hsl(199 89% 48%)', 'hsl(0 72% 51%)'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const Analytics = () => {
  const { restaurant } = useAuth();
  const { exportToExcel, exportToPDF } = useReportExport();
  const [period, setPeriod] = useState('7');
  const [activeTab, setActiveTab] = useState('overview');

  const periodDays = parseInt(period);

  const startDate = useMemo(() => {
    return startOfDay(subDays(new Date(), periodDays - 1));
  }, [periodDays]);

  const previousStartDate = useMemo(() => {
    return startOfDay(subDays(new Date(), periodDays * 2 - 1));
  }, [periodDays]);

  const previousEndDate = useMemo(() => {
    return endOfDay(subDays(new Date(), periodDays));
  }, [periodDays]);

  // Current period orders
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

  // Previous period orders for comparison
  const { data: previousOrders = [] } = useQuery({
    queryKey: ['analytics-previous-orders', restaurant?.id, period],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', previousStartDate.toISOString())
        .lte('created_at', previousEndDate.toISOString())
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
    const prevCompletedOrders = previousOrders.filter(o => o.status === 'delivered' || o.status === 'ready' || o.status === 'preparing');
    
    const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const prevTotalRevenue = prevCompletedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    
    const totalDeliveryFees = completedOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
    const totalOrders = completedOrders.length;
    const prevTotalOrders = prevCompletedOrders.length;
    
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const prevAvgTicket = prevTotalOrders > 0 ? prevTotalRevenue / prevTotalOrders : 0;
    
    const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

    // Orders by type
    const tableOrders = completedOrders.filter(o => o.order_type === 'table').length;
    const counterOrders = completedOrders.filter(o => o.order_type === 'counter').length;
    const deliveryOrders = completedOrders.filter(o => o.order_type === 'delivery').length;

    // Payment methods
    const paymentMethods: { [key: string]: number } = {};
    completedOrders.forEach(o => {
      const method = o.payment_method || 'Não informado';
      paymentMethods[method] = (paymentMethods[method] || 0) + (o.total || 0);
    });

    // Calculate growth percentages
    const revenueGrowth = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;
    const ordersGrowth = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0;
    const ticketGrowth = prevAvgTicket > 0 ? ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100 : 0;

    return {
      totalRevenue,
      prevTotalRevenue,
      totalDeliveryFees,
      totalOrders,
      prevTotalOrders,
      avgTicket,
      prevAvgTicket,
      totalItems,
      tableOrders,
      counterOrders,
      deliveryOrders,
      paymentMethods,
      revenueGrowth,
      ordersGrowth,
      ticketGrowth,
    };
  }, [orders, previousOrders, orderItems]);

  // Revenue by day chart
  const revenueByDay = useMemo(() => {
    const data: { date: string; revenue: number; orders: number; prevRevenue: number }[] = [];

    for (let i = periodDays - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const prevDate = subDays(new Date(), i + periodDays);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const prevDayStart = startOfDay(prevDate);
      const prevDayEnd = endOfDay(prevDate);

      const dayOrders = orders.filter(o => {
        const orderDate = parseISO(o.created_at);
        return isWithinInterval(orderDate, { start: dayStart, end: dayEnd }) &&
          (o.status === 'delivered' || o.status === 'ready' || o.status === 'preparing');
      });

      const prevDayOrders = previousOrders.filter(o => {
        const orderDate = parseISO(o.created_at);
        return isWithinInterval(orderDate, { start: prevDayStart, end: prevDayEnd }) &&
          (o.status === 'delivered' || o.status === 'ready' || o.status === 'preparing');
      });

      data.push({
        date: format(date, 'dd/MM', { locale: ptBR }),
        revenue: dayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        orders: dayOrders.length,
        prevRevenue: prevDayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      });
    }

    return data;
  }, [orders, previousOrders, periodDays]);

  // Orders by hour with peak analysis
  const ordersByHour = useMemo(() => {
    const hours: { [key: number]: { count: number; revenue: number } } = {};
    for (let i = 0; i < 24; i++) hours[i] = { count: 0, revenue: 0 };

    orders.forEach(order => {
      if (order.status === 'delivered' || order.status === 'ready' || order.status === 'preparing') {
        const hour = getHours(parseISO(order.created_at));
        hours[hour].count++;
        hours[hour].revenue += order.total || 0;
      }
    });

    const data = Object.entries(hours).map(([hour, { count, revenue }]) => ({
      hour: `${hour}h`,
      hourNum: parseInt(hour),
      pedidos: count,
      faturamento: revenue,
    }));

    const maxPedidos = Math.max(...data.map(d => d.pedidos));
    return data.map(d => ({
      ...d,
      isPeak: d.pedidos === maxPedidos && maxPedidos > 0,
    }));
  }, [orders]);

  // Peak hours analysis
  const peakHoursAnalysis = useMemo(() => {
    const sorted = [...ordersByHour].sort((a, b) => b.pedidos - a.pedidos);
    const peakHours = sorted.slice(0, 3).filter(h => h.pedidos > 0);
    const slowHours = sorted.slice(-3).filter(h => h.pedidos >= 0).reverse();
    return { peakHours, slowHours };
  }, [ordersByHour]);

  // Orders by weekday
  const ordersByWeekday = useMemo(() => {
    const weekdays: { [key: number]: { count: number; revenue: number } } = {};
    for (let i = 0; i < 7; i++) weekdays[i] = { count: 0, revenue: 0 };

    orders.forEach(order => {
      if (order.status === 'delivered' || order.status === 'ready' || order.status === 'preparing') {
        const day = getDay(parseISO(order.created_at));
        weekdays[day].count++;
        weekdays[day].revenue += order.total || 0;
      }
    });

    return Object.entries(weekdays).map(([day, { count, revenue }]) => ({
      day: WEEKDAYS[parseInt(day)],
      dayNum: parseInt(day),
      pedidos: count,
      faturamento: revenue,
    }));
  }, [orders]);

  // Top products with more details
  const topProducts = useMemo(() => {
    const productMap: { [key: string]: { name: string; quantity: number; revenue: number } } = {};

    orderItems.forEach(item => {
      if (!productMap[item.product_name]) {
        productMap[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
      }
      productMap[item.product_name].quantity += item.quantity;
      productMap[item.product_name].revenue += item.product_price * item.quantity;
    });

    const products = Object.values(productMap).sort((a, b) => b.quantity - a.quantity);
    const maxQuantity = products.length > 0 ? products[0].quantity : 1;

    return products.slice(0, 10).map(p => ({
      ...p,
      percentage: (p.quantity / maxQuantity) * 100,
    }));
  }, [orderItems]);

  // Payment methods for pie chart
  const paymentMethodsData = useMemo(() => {
    const methodNames: { [key: string]: string } = {
      'pix': 'PIX',
      'credit': 'Crédito',
      'debit': 'Débito',
      'cash': 'Dinheiro',
      'Não informado': 'Não informado',
    };

    return Object.entries(metrics.paymentMethods)
      .map(([method, value]) => ({
        name: methodNames[method] || method,
        value: value,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [metrics.paymentMethods]);

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

  const renderGrowthBadge = (growth: number) => {
    if (growth === 0) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Minus className="w-3 h-3" />
          0%
        </Badge>
      );
    }
    if (growth > 0) {
      return (
        <Badge className="gap-1 bg-green-500/20 text-green-600 hover:bg-green-500/30">
          <ArrowUpRight className="w-3 h-3" />
          +{growth.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge className="gap-1 bg-red-500/20 text-red-600 hover:bg-red-500/30">
        <ArrowDownRight className="w-3 h-3" />
        {growth.toFixed(1)}%
      </Badge>
    );
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
        { label: 'Crescimento Faturamento', value: `${metrics.revenueGrowth >= 0 ? '+' : ''}${metrics.revenueGrowth.toFixed(1)}%` },
        { label: 'Total de Pedidos', value: String(metrics.totalOrders) },
        { label: 'Crescimento Pedidos', value: `${metrics.ordersGrowth >= 0 ? '+' : ''}${metrics.ordersGrowth.toFixed(1)}%` },
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
              Relatórios Avançados
            </h1>
            <p className="text-muted-foreground mt-1">
              Análise completa do desempenho do seu restaurante
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
            {/* Main Stats Cards with Growth */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Faturamento Total</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(metrics.totalRevenue)}
                      </p>
                      <div className="flex items-center gap-2">
                        {renderGrowthBadge(metrics.revenueGrowth)}
                        <span className="text-xs text-muted-foreground">vs período anterior</span>
                      </div>
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
                      <div className="flex items-center gap-2">
                        {renderGrowthBadge(metrics.ordersGrowth)}
                        <span className="text-xs text-muted-foreground">vs período anterior</span>
                      </div>
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
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Ticket Médio</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(metrics.avgTicket)}
                      </p>
                      <div className="flex items-center gap-2">
                        {renderGrowthBadge(metrics.ticketGrowth)}
                        <span className="text-xs text-muted-foreground">vs período anterior</span>
                      </div>
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
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Itens Vendidos</p>
                      <p className="text-2xl font-bold text-foreground">
                        {metrics.totalItems}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {metrics.totalOrders > 0 ? (metrics.totalItems / metrics.totalOrders).toFixed(1) : '0'} itens/pedido
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Package className="w-6 h-6 text-orange-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for different views */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
                <TabsTrigger value="overview" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Visão Geral</span>
                </TabsTrigger>
                <TabsTrigger value="products" className="gap-2">
                  <Award className="w-4 h-4" />
                  <span className="hidden sm:inline">Produtos</span>
                </TabsTrigger>
                <TabsTrigger value="timing" className="gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Horários</span>
                </TabsTrigger>
                <TabsTrigger value="channels" className="gap-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Canais</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Revenue Over Time with Comparison */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Faturamento por Dia
                      </CardTitle>
                      <CardDescription>Comparação com o período anterior</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={revenueByDay}>
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
                              formatter={(value: number, name: string) => [
                                formatCurrency(value), 
                                name === 'revenue' ? 'Atual' : 'Período Anterior'
                              ]}
                              contentStyle={{ 
                                backgroundColor: 'hsl(var(--card))', 
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                              }}
                            />
                            <Legend />
                            <Area 
                              type="monotone" 
                              dataKey="revenue" 
                              name="Atual"
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              fill="url(#colorRevenue)" 
                            />
                            <Line 
                              type="monotone" 
                              dataKey="prevRevenue" 
                              name="Período Anterior"
                              stroke="hsl(var(--muted-foreground))" 
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                            />
                          </ComposedChart>
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

                {/* Quick Stats */}
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
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Products Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" />
                        Top 10 Produtos
                      </CardTitle>
                      <CardDescription>Produtos mais vendidos por quantidade</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {topProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                          <Package className="w-12 h-12 mb-2 opacity-50" />
                          <p>Nenhum produto vendido no período</p>
                        </div>
                      ) : (
                        <div className="h-[400px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProducts} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis 
                                type="number"
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                tickLine={{ stroke: 'hsl(var(--border))' }}
                              />
                              <YAxis 
                                type="category"
                                dataKey="name"
                                width={120}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                                tickLine={{ stroke: 'hsl(var(--border))' }}
                              />
                              <Tooltip 
                                formatter={(value: number, name: string) => [
                                  name === 'quantity' ? `${value} unidades` : formatCurrency(value),
                                  name === 'quantity' ? 'Quantidade' : 'Faturamento'
                                ]}
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                              />
                              <Bar 
                                dataKey="quantity" 
                                fill="hsl(var(--primary))" 
                                radius={[0, 4, 4, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Products List with Progress */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        Ranking de Produtos
                      </CardTitle>
                      <CardDescription>Detalhamento por faturamento</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {topProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                          <Package className="w-12 h-12 mb-2 opacity-50" />
                          <p>Nenhum produto vendido no período</p>
                        </div>
                      ) : (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                          {topProducts.map((product, index) => (
                            <div key={product.name} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                    index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                                    index === 1 ? 'bg-gray-400/20 text-gray-600' :
                                    index === 2 ? 'bg-orange-600/20 text-orange-600' :
                                    'bg-primary/10 text-primary'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground text-sm">
                                      {product.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {product.quantity} vendidos
                                    </p>
                                  </div>
                                </div>
                                <p className="font-semibold text-foreground">
                                  {formatCurrency(product.revenue)}
                                </p>
                              </div>
                              <Progress value={product.percentage} className="h-2" />
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Timing Tab */}
              <TabsContent value="timing" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Peak Hours Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-500" />
                        Horários de Pico
                      </CardTitle>
                      <CardDescription>Melhores horários para vendas</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-3">🔥 Horários mais movimentados</p>
                        {peakHoursAnalysis.peakHours.map((hour, index) => (
                          <div key={hour.hour} className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                              <span className="font-medium">{hour.hour}</span>
                            </div>
                            <Badge variant="secondary">{hour.pedidos} pedidos</Badge>
                          </div>
                        ))}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-3">💤 Horários mais calmos</p>
                        {peakHoursAnalysis.slowHours.map((hour) => (
                          <div key={hour.hour} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 mb-2">
                            <span className="font-medium">{hour.hour}</span>
                            <Badge variant="outline">{hour.pedidos} pedidos</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Orders by Hour Chart */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        Distribuição por Hora
                      </CardTitle>
                      <CardDescription>Pedidos ao longo do dia</CardDescription>
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
                              formatter={(value: number, name: string) => [
                                name === 'pedidos' ? `${value} pedidos` : formatCurrency(value),
                                name === 'pedidos' ? 'Pedidos' : 'Faturamento'
                              ]}
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
                </div>

                {/* Weekday Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Desempenho por Dia da Semana
                    </CardTitle>
                    <CardDescription>Compare os dias mais lucrativos</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={ordersByWeekday}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="day" 
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            tickLine={{ stroke: 'hsl(var(--border))' }}
                          />
                          <YAxis 
                            yAxisId="left"
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            tickLine={{ stroke: 'hsl(var(--border))' }}
                          />
                          <YAxis 
                            yAxisId="right"
                            orientation="right"
                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                            tickLine={{ stroke: 'hsl(var(--border))' }}
                            tickFormatter={(value) => `R$${value}`}
                          />
                          <Tooltip 
                            formatter={(value: number, name: string) => [
                              name === 'pedidos' ? `${value} pedidos` : formatCurrency(value),
                              name === 'pedidos' ? 'Pedidos' : 'Faturamento'
                            ]}
                            contentStyle={{ 
                              backgroundColor: 'hsl(var(--card))', 
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px'
                            }}
                          />
                          <Legend />
                          <Bar 
                            yAxisId="left"
                            dataKey="pedidos" 
                            name="Pedidos"
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]}
                          />
                          <Line 
                            yAxisId="right"
                            type="monotone" 
                            dataKey="faturamento" 
                            name="Faturamento"
                            stroke="hsl(142 76% 36%)" 
                            strokeWidth={3}
                            dot={{ fill: 'hsl(142 76% 36%)', strokeWidth: 2 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Channels Tab */}
              <TabsContent value="channels" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Payment Methods */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        Formas de Pagamento
                      </CardTitle>
                      <CardDescription>Distribuição por método de pagamento</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {paymentMethodsData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                          <DollarSign className="w-12 h-12 mb-2 opacity-50" />
                          <p>Nenhum pagamento registrado</p>
                        </div>
                      ) : (
                        <>
                          <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={paymentMethodsData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {paymentMethodsData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                                  contentStyle={{ 
                                    backgroundColor: 'hsl(var(--card))', 
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px'
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-2 mt-4">
                            {paymentMethodsData.map((item, index) => (
                              <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                  />
                                  <span className="text-sm font-medium">{item.name}</span>
                                </div>
                                <span className="text-sm font-semibold">{formatCurrency(item.value)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Channel Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Performance por Canal
                      </CardTitle>
                      <CardDescription>Comparativo de vendas por canal</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {[
                          { 
                            name: 'Mesa', 
                            icon: Utensils, 
                            orders: metrics.tableOrders,
                            color: 'bg-primary',
                            bgColor: 'bg-primary/10',
                            textColor: 'text-primary'
                          },
                          { 
                            name: 'Balcão', 
                            icon: Store, 
                            orders: metrics.counterOrders,
                            color: 'bg-blue-500',
                            bgColor: 'bg-blue-500/10',
                            textColor: 'text-blue-500'
                          },
                          { 
                            name: 'Delivery', 
                            icon: Truck, 
                            orders: metrics.deliveryOrders,
                            color: 'bg-orange-500',
                            bgColor: 'bg-orange-500/10',
                            textColor: 'text-orange-500'
                          },
                        ].map((channel) => {
                          const percentage = metrics.totalOrders > 0 
                            ? (channel.orders / metrics.totalOrders) * 100 
                            : 0;
                          return (
                            <div key={channel.name} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-full ${channel.bgColor} flex items-center justify-center`}>
                                    <channel.icon className={`w-5 h-5 ${channel.textColor}`} />
                                  </div>
                                  <div>
                                    <p className="font-medium">{channel.name}</p>
                                    <p className="text-sm text-muted-foreground">{channel.orders} pedidos</p>
                                  </div>
                                </div>
                                <Badge variant="secondary">{percentage.toFixed(1)}%</Badge>
                              </div>
                              <Progress value={percentage} className={`h-2 ${channel.color}`} />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
