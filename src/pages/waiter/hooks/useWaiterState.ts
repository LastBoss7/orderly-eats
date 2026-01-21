import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, Tab, Category, Product, Order, Customer } from '../types';

interface UseWaiterStateOptions {
  restaurantId: string | undefined;
  isPublicAccess: boolean;
}

export function useWaiterState({ restaurantId, isPublicAccess }: UseWaiterStateOptions) {
  const [tables, setTables] = useState<Table[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tableOrders, setTableOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [tableReadyOrders, setTableReadyOrders] = useState<Record<string, boolean>>({});

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!restaurantId) return;

    try {
      const [tablesRes, tabsRes, categoriesRes, productsRes] = await Promise.all([
        supabase.from('tables').select('*').eq('restaurant_id', restaurantId).order('number'),
        supabase.from('tabs').select('*').eq('restaurant_id', restaurantId).order('number'),
        supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('sort_order'),
        supabase.from('products').select('*').eq('restaurant_id', restaurantId).eq('is_available', true).order('name'),
      ]);

      setTables((tablesRes.data || []) as Table[]);
      setTabs((tabsRes.data || []) as Tab[]);
      setCategories(categoriesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  // Fetch table total
  const fetchTableTotal = useCallback(async (tableId: string): Promise<number> => {
    if (!restaurantId) return 0;
    
    const { data } = await supabase
      .from('orders')
      .select('total')
      .eq('table_id', tableId)
      .in('status', ['pending', 'preparing', 'ready', 'served']);
    
    return (data || []).reduce((sum, o) => sum + (o.total || 0), 0);
  }, [restaurantId]);

  // Fetch orders for table
  const fetchTableOrders = useCallback(async (tableId: string) => {
    setLoadingOrders(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('table_id', tableId)
        .in('status', ['pending', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: false });
      
      setTableOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Fetch orders for tab
  const fetchTabOrders = useCallback(async (tabId: string) => {
    setLoadingOrders(true);
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('tab_id', tabId)
        .in('status', ['pending', 'preparing', 'ready', 'served'])
        .order('created_at', { ascending: false });
      
      setTableOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Refresh ready orders
  const refreshReadyOrders = useCallback(async () => {
    if (!restaurantId) return;
    
    const { data } = await supabase
      .from('orders')
      .select('table_id')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'ready');
    
    const readyMap: Record<string, boolean> = {};
    data?.forEach((order) => {
      if (order.table_id) readyMap[order.table_id] = true;
    });
    setTableReadyOrders(readyMap);
  }, [restaurantId]);

  // Search customers
  const searchCustomers = useCallback(async (phone: string) => {
    if (!restaurantId || phone.length < 3) {
      setCustomers([]);
      return;
    }

    try {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .or(`phone.ilike.%${phone}%,name.ilike.%${phone}%`)
        .limit(5);

      setCustomers((data || []) as Customer[]);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  }, [restaurantId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Ready orders polling
  useEffect(() => {
    refreshReadyOrders();
    const interval = setInterval(refreshReadyOrders, 5000);
    return () => clearInterval(interval);
  }, [refreshReadyOrders]);

  // Realtime subscription for authenticated access
  useEffect(() => {
    if (!restaurantId || isPublicAccess) return;

    const channel = supabase
      .channel('waiter-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables' },
        async () => {
          const { data } = await supabase.from('tables').select('*').eq('restaurant_id', restaurantId).order('number');
          setTables((data || []) as Table[]);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tabs' },
        async () => {
          const { data } = await supabase.from('tabs').select('*').eq('restaurant_id', restaurantId).order('number');
          setTabs((data || []) as Tab[]);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => refreshReadyOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, isPublicAccess, refreshReadyOrders]);

  // Polling for public access
  useEffect(() => {
    if (!restaurantId || !isPublicAccess) return;

    const pollData = async () => {
      const [tablesRes, tabsRes] = await Promise.all([
        supabase.from('tables').select('*').eq('restaurant_id', restaurantId).order('number'),
        supabase.from('tabs').select('*').eq('restaurant_id', restaurantId).order('number'),
      ]);
      setTables((tablesRes.data || []) as Table[]);
      setTabs((tabsRes.data || []) as Tab[]);
      await refreshReadyOrders();
    };

    const interval = setInterval(pollData, 5000);
    return () => clearInterval(interval);
  }, [restaurantId, isPublicAccess, refreshReadyOrders]);

  return {
    tables,
    setTables,
    tabs,
    setTabs,
    categories,
    products,
    tableOrders,
    setTableOrders,
    customers,
    setCustomers,
    loading,
    loadingOrders,
    tableReadyOrders,
    fetchTableTotal,
    fetchTableOrders,
    fetchTabOrders,
    searchCustomers,
    refreshReadyOrders,
  };
}
