import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Loader2,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProductPrepTime {
  product_name: string;
  total_orders: number;
  avg_prep_time_minutes: number;
  min_prep_time_minutes: number;
  max_prep_time_minutes: number;
}

interface DailyStats {
  date: string;
  avg_prep_time: number;
  total_orders: number;
}

export default function PrepTimeReport() {
  const { restaurant } = useAuth();
  const [loading, setLoading] = useState(true);
  const [productStats, setProductStats] = useState<ProductPrepTime[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [period, setPeriod] = useState<'7' | '30' | '90'>('7');
  const [overallAvg, setOverallAvg] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [restaurant?.id, period]);

  const fetchStats = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      const daysAgo = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Fetch orders with ready_at that have been completed
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          ready_at,
          order_items (
            product_name,
            quantity
          )
        `)
        .eq('restaurant_id', restaurant.id)
        .not('ready_at', 'is', null)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process product statistics
      const productMap = new Map<string, {
        times: number[];
        orders: number;
      }>();

      let totalPrepTime = 0;
      let validOrderCount = 0;

      // Process daily stats
      const dailyMap = new Map<string, { times: number[]; count: number }>();

      orders?.forEach(order => {
        if (!order.ready_at) return;

        const createdAt = new Date(order.created_at);
        const readyAt = new Date(order.ready_at);
        const prepTimeMinutes = (readyAt.getTime() - createdAt.getTime()) / 1000 / 60;

        // Skip unrealistic times (negative or > 3 hours)
        if (prepTimeMinutes < 0 || prepTimeMinutes > 180) return;

        totalPrepTime += prepTimeMinutes;
        validOrderCount++;

        // Daily stats
        const dateKey = createdAt.toISOString().split('T')[0];
        if (!dailyMap.has(dateKey)) {
          dailyMap.set(dateKey, { times: [], count: 0 });
        }
        const dayData = dailyMap.get(dateKey)!;
        dayData.times.push(prepTimeMinutes);
        dayData.count++;

        // Product stats
        order.order_items?.forEach((item: { product_name: string; quantity: number }) => {
          if (!productMap.has(item.product_name)) {
            productMap.set(item.product_name, { times: [], orders: 0 });
          }
          const data = productMap.get(item.product_name)!;
          data.times.push(prepTimeMinutes);
          data.orders += item.quantity;
        });
      });

      // Calculate product averages
      const products: ProductPrepTime[] = Array.from(productMap.entries())
        .map(([name, data]) => ({
          product_name: name,
          total_orders: data.orders,
          avg_prep_time_minutes: data.times.reduce((a, b) => a + b, 0) / data.times.length,
          min_prep_time_minutes: Math.min(...data.times),
          max_prep_time_minutes: Math.max(...data.times),
        }))
        .sort((a, b) => b.avg_prep_time_minutes - a.avg_prep_time_minutes);

      // Calculate daily averages
      const daily: DailyStats[] = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          avg_prep_time: data.times.reduce((a, b) => a + b, 0) / data.times.length,
          total_orders: data.count,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setProductStats(products);
      setDailyStats(daily);
      setOverallAvg(validOrderCount > 0 ? totalPrepTime / validOrderCount : 0);
      setTotalOrders(validOrderCount);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  const getStatusColor = (avgTime: number) => {
    if (avgTime <= 15) return 'text-green-600';
    if (avgTime <= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (avgTime: number) => {
    if (avgTime <= 15) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Rápido</Badge>;
    }
    if (avgTime <= 30) {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Normal</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800 border-red-200">Lento</Badge>;
  };

  const getBarColor = (avgTime: number) => {
    if (avgTime <= 15) return 'hsl(142, 76%, 36%)';
    if (avgTime <= 30) return 'hsl(45, 93%, 47%)';
    return 'hsl(0, 84%, 60%)';
  };

  const chartData = productStats.slice(0, 10).map(p => ({
    name: p.product_name.length > 20 
      ? p.product_name.substring(0, 17) + '...' 
      : p.product_name,
    tempo: Math.round(p.avg_prep_time_minutes),
    fullName: p.product_name,
  }));

  return (
    <DashboardLayout>
      <div className="p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Tempo de Preparo
              </h1>
              <p className="text-muted-foreground">
                Análise de tempo médio por produto
              </p>
            </div>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as '7' | '30' | '90')}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Clock className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tempo Médio</p>
                      <p className="text-2xl font-bold">{formatTime(overallAvg)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pedidos Analisados</p>
                      <p className="text-2xl font-bold">{totalOrders}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-yellow-100">
                      <TrendingUp className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mais Rápido</p>
                      <p className="text-2xl font-bold">
                        {productStats.length > 0 
                          ? formatTime(Math.min(...productStats.map(p => p.avg_prep_time_minutes)))
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-red-100">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mais Lento</p>
                      <p className="text-2xl font-bold">
                        {productStats.length > 0 
                          ? formatTime(Math.max(...productStats.map(p => p.avg_prep_time_minutes)))
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            {chartData.length > 0 && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Top 10 - Tempo de Preparo por Produto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={chartData} 
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis 
                          type="number" 
                          unit=" min"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={150}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value} min`, 'Tempo médio']}
                          labelFormatter={(label) => {
                            const item = chartData.find(d => d.name === label);
                            return item?.fullName || label;
                          }}
                        />
                        <Bar dataKey="tempo" radius={[0, 4, 4, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.tempo)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Products Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Produto</CardTitle>
              </CardHeader>
              <CardContent>
                {productStats.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum dado de tempo de preparo disponível</p>
                    <p className="text-sm">Os dados serão coletados conforme os pedidos são finalizados</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-center">Pedidos</TableHead>
                        <TableHead className="text-center">Tempo Médio</TableHead>
                        <TableHead className="text-center">Mínimo</TableHead>
                        <TableHead className="text-center">Máximo</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productStats.map((product, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {product.product_name}
                          </TableCell>
                          <TableCell className="text-center">
                            {product.total_orders}
                          </TableCell>
                          <TableCell className={`text-center font-semibold ${getStatusColor(product.avg_prep_time_minutes)}`}>
                            {formatTime(product.avg_prep_time_minutes)}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {formatTime(product.min_prep_time_minutes)}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {formatTime(product.max_prep_time_minutes)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(product.avg_prep_time_minutes)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
