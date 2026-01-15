import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RestaurantMetrics {
  restaurant_id: string;
  restaurant_name: string;
  slug: string;
  cnpj: string | null;
  phone: string | null;
  address: string | null;
  restaurant_created_at: string;
  is_open: boolean | null;
  daily_order_counter: number | null;
  total_orders: number;
  orders_today: number;
  total_revenue: number;
  revenue_today: number;
  total_products: number;
  total_tables: number;
  total_waiters: number;
  total_categories: number;
}

interface ConsolidatedMetrics {
  totalRestaurants: number;
  totalOrders: number;
  ordersToday: number;
  totalRevenue: number;
  revenueToday: number;
  totalProducts: number;
  totalTables: number;
  totalWaiters: number;
  openRestaurants: number;
}

export function useAdminMetrics() {
  const [restaurants, setRestaurants] = useState<RestaurantMetrics[]>([]);
  const [consolidated, setConsolidated] = useState<ConsolidatedMetrics>({
    totalRestaurants: 0,
    totalOrders: 0,
    ordersToday: 0,
    totalRevenue: 0,
    revenueToday: 0,
    totalProducts: 0,
    totalTables: 0,
    totalWaiters: 0,
    openRestaurants: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch from the admin view
      const { data, error: fetchError } = await supabase
        .from('admin_restaurant_metrics')
        .select('*')
        .order('restaurant_name');

      if (fetchError) {
        throw fetchError;
      }

      const metrics = (data || []) as RestaurantMetrics[];
      setRestaurants(metrics);

      // Calculate consolidated metrics
      const consolidated: ConsolidatedMetrics = {
        totalRestaurants: metrics.length,
        totalOrders: metrics.reduce((sum, r) => sum + (r.total_orders || 0), 0),
        ordersToday: metrics.reduce((sum, r) => sum + (r.orders_today || 0), 0),
        totalRevenue: metrics.reduce((sum, r) => sum + (Number(r.total_revenue) || 0), 0),
        revenueToday: metrics.reduce((sum, r) => sum + (Number(r.revenue_today) || 0), 0),
        totalProducts: metrics.reduce((sum, r) => sum + (r.total_products || 0), 0),
        totalTables: metrics.reduce((sum, r) => sum + (r.total_tables || 0), 0),
        totalWaiters: metrics.reduce((sum, r) => sum + (r.total_waiters || 0), 0),
        openRestaurants: metrics.filter(r => r.is_open).length,
      };
      setConsolidated(consolidated);
    } catch (err) {
      console.error('Error fetching admin metrics:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return {
    restaurants,
    consolidated,
    loading,
    error,
    refetch: fetchMetrics,
  };
}
