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
  account_active: boolean;
  suspended_at: string | null;
  suspended_reason: string | null;
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
  activeRestaurants: number;
  suspendedRestaurants: number;
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
    activeRestaurants: 0,
    suspendedRestaurants: 0,
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
        activeRestaurants: metrics.filter(r => r.account_active).length,
        suspendedRestaurants: metrics.filter(r => !r.account_active).length,
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

  const suspendRestaurant = async (restaurantId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          is_active: false,
          suspended_at: new Date().toISOString(),
          suspended_reason: reason,
        })
        .eq('id', restaurantId);

      if (error) throw error;
      await fetchMetrics();
      return { success: true };
    } catch (err) {
      console.error('Error suspending restaurant:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao suspender' };
    }
  };

  const reactivateRestaurant = async (restaurantId: string) => {
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          is_active: true,
          suspended_at: null,
          suspended_reason: null,
        })
        .eq('id', restaurantId);

      if (error) throw error;
      await fetchMetrics();
      return { success: true };
    } catch (err) {
      console.error('Error reactivating restaurant:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao reativar' };
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
    suspendRestaurant,
    reactivateRestaurant,
  };
}
