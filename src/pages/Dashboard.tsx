import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  ShoppingBag, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  occupiedTables: number;
  totalTables: number;
}

export default function Dashboard() {
  const { restaurant } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    occupiedTables: 0,
    totalTables: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!restaurant?.id) return;

      try {
        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch orders
        const { data: orders } = await supabase
          .from('orders')
          .select('*')
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString());

        // Fetch tables
        const { data: tables } = await supabase
          .from('tables')
          .select('*');

        const ordersList = orders || [];
        const tablesList = tables || [];

        setStats({
          totalSales: ordersList
            .filter(o => o.status === 'delivered')
            .reduce((sum, o) => sum + Number(o.total || 0), 0),
          totalOrders: ordersList.length,
          pendingOrders: ordersList.filter(o => ['pending', 'preparing'].includes(o.status)).length,
          completedOrders: ordersList.filter(o => o.status === 'delivered').length,
          occupiedTables: tablesList.filter(t => t.status === 'occupied').length,
          totalTables: tablesList.length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [restaurant?.id]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral de {restaurant?.name || 'seu restaurante'} hoje
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Sales */}
          <Card className="stats-card primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vendas do Dia
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : formatCurrency(stats.totalSales)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completedOrders} pedidos finalizados
              </p>
            </CardContent>
          </Card>

          {/* Total Orders */}
          <Card className="stats-card success">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Pedidos
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.totalOrders}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                pedidos realizados hoje
              </p>
            </CardContent>
          </Card>

          {/* Pending Orders */}
          <Card className="stats-card warning">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pedidos Pendentes
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : stats.pendingOrders}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                aguardando preparo/entrega
              </p>
            </CardContent>
          </Card>

          {/* Tables Status */}
          <Card className="stats-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mesas Ocupadas
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : `${stats.occupiedTables}/${stats.totalTables}`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                mesas em uso agora
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Nova Venda</h3>
                <p className="text-sm text-muted-foreground">Acessar o PDV</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold">Ver Mesas</h3>
                <p className="text-sm text-muted-foreground">Gerenciar ocupação</p>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold">Pedidos Pendentes</h3>
                <p className="text-sm text-muted-foreground">{stats.pendingOrders} aguardando</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
