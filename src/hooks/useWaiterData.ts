import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/waiter-data`;

// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 15000; // 15 seconds - increased for better performance

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

interface UseWaiterDataOptions {
  restaurantId: string;
  useEdgeFunction?: boolean;
}

export function useWaiterData({ restaurantId, useEdgeFunction = false }: UseWaiterDataOptions) {
  const [loading, setLoading] = useState(false);

  const fetchFromEdge = useCallback(async (action: string, params: Record<string, string> = {}) => {
    const cacheKey = `edge:${restaurantId}:${action}:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const searchParams = new URLSearchParams({
      restaurant_id: restaurantId,
      action,
      ...params,
    });

    const response = await fetch(`${FUNCTION_URL}?${searchParams.toString()}`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Edge function error for ${action}:`, errorText);
      throw new Error(`Failed to fetch data: ${action}`);
    }

    const result = await response.json();
    setCache(cacheKey, result);
    return result;
  }, [restaurantId]);

  const postToEdge = useCallback(async (action: string, body: Record<string, any>) => {
    const searchParams = new URLSearchParams({
      restaurant_id: restaurantId,
      action,
    });

    const response = await fetch(`${FUNCTION_URL}?${searchParams.toString()}`, {
      method: 'POST',
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to post data');
    }

    return response.json();
  }, [restaurantId]);

  const fetchTables = useCallback(async () => {
    if (useEdgeFunction) {
      const result = await fetchFromEdge('tables');
      return result.data || [];
    }
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('number');
    return data || [];
  }, [restaurantId, useEdgeFunction, fetchFromEdge]);

  const fetchTabs = useCallback(async () => {
    if (useEdgeFunction) {
      const result = await fetchFromEdge('tabs');
      return result.data || [];
    }
    const { data } = await supabase
      .from('tabs')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('number');
    return data || [];
  }, [restaurantId, useEdgeFunction, fetchFromEdge]);

  const fetchCategories = useCallback(async () => {
    if (useEdgeFunction) {
      const result = await fetchFromEdge('categories');
      return result.data || [];
    }
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order');
    return data || [];
  }, [restaurantId, useEdgeFunction, fetchFromEdge]);

  const fetchProducts = useCallback(async (categoryId?: string) => {
    if (useEdgeFunction) {
      const params = categoryId ? { category_id: categoryId } : {};
      const result = await fetchFromEdge('products', params);
      return result.data || [];
    }
    
    let query = supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true);
    
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    
    const { data } = await query.order('name');
    return data || [];
  }, [restaurantId, useEdgeFunction, fetchFromEdge]);

  const fetchTableOrders = useCallback(async (tableId: string) => {
    if (useEdgeFunction) {
      const result = await fetchFromEdge('table-orders', { table_id: tableId });
      return result.data || [];
    }
    const { data } = await supabase
      .from('orders')
      .select(`*, order_items (*), waiters (id, name)`)
      .eq('restaurant_id', restaurantId)
      .eq('table_id', tableId)
      .in('status', ['pending', 'preparing', 'ready', 'served'])
      .order('created_at', { ascending: true });
    return data || [];
  }, [restaurantId, useEdgeFunction, fetchFromEdge]);

  const fetchTabOrders = useCallback(async (tabId: string) => {
    if (useEdgeFunction) {
      const result = await fetchFromEdge('tab-orders', { tab_id: tabId });
      return result.data || [];
    }
    const { data } = await supabase
      .from('orders')
      .select(`*, order_items (*), waiters (id, name)`)
      .eq('restaurant_id', restaurantId)
      .eq('tab_id', tabId)
      .in('status', ['pending', 'preparing', 'ready', 'served'])
      .order('created_at', { ascending: true });
    return data || [];
  }, [restaurantId, useEdgeFunction, fetchFromEdge]);

  const fetchReadyOrders = useCallback(async () => {
    if (useEdgeFunction) {
      const result = await fetchFromEdge('ready-orders');
      return result.data || [];
    }
    const { data } = await supabase
      .from('orders')
      .select('table_id, status')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'ready')
      .not('table_id', 'is', null);
    return data || [];
  }, [restaurantId, useEdgeFunction, fetchFromEdge]);

  const fetchTableTotal = useCallback(async (tableId: string) => {
    if (useEdgeFunction) {
      const result = await fetchFromEdge('table-total', { table_id: tableId });
      return result.total || 0;
    }
    const { data } = await supabase
      .from('orders')
      .select('total')
      .eq('restaurant_id', restaurantId)
      .eq('table_id', tableId)
      .in('status', ['pending', 'preparing', 'ready', 'served']);
    return data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
  }, [restaurantId, useEdgeFunction, fetchFromEdge]);

  const createOrder = useCallback(async (orderData: any) => {
    if (useEdgeFunction) {
      return postToEdge('create-order', orderData);
    }
    
    // Get next order number atomically using database function
    const { data: orderNumber, error: orderNumberError } = await supabase
      .rpc('get_next_order_number', { _restaurant_id: restaurantId });

    if (orderNumberError) throw orderNumberError;
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_id: orderData.table_id || null,
        tab_id: orderData.tab_id || null,
        order_type: orderData.order_type,
        status: 'pending',
        print_status: orderData.print_status || 'pending',
        total: orderData.total,
        notes: orderData.notes || null,
        customer_id: orderData.customer_id || null,
        customer_name: orderData.customer_name || null,
        delivery_address: orderData.delivery_address || null,
        delivery_phone: orderData.delivery_phone || null,
        delivery_fee: orderData.delivery_fee || 0,
        waiter_id: orderData.waiter_id || null,
        order_number: orderNumber,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    if (orderData.items?.length > 0) {
      const orderItems = orderData.items.map((item: any) => ({
        restaurant_id: restaurantId,
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_price: item.product_price,
        quantity: item.quantity,
        notes: item.notes || null,
        product_size: item.product_size || null,
        category_id: item.category_id || null,
      }));

      await supabase.from('order_items').insert(orderItems);
    }

    if (orderData.table_id) {
      await supabase
        .from('tables')
        .update({ status: 'occupied' })
        .eq('id', orderData.table_id);
    }

    if (orderData.tab_id) {
      await supabase
        .from('tabs')
        .update({ status: 'occupied' })
        .eq('id', orderData.tab_id);
    }

    return { success: true, order };
  }, [restaurantId, useEdgeFunction, postToEdge]);

  const closeOrders = useCallback(async (data: {
    order_ids: string[];
    table_id?: string;
    tab_id?: string;
    payment_method: string;
    cash_received?: number;
    change_given?: number;
    split_count?: number;
    payments?: Array<{
      id: string;
      method: string;
      amount: number;
      cashReceived?: number;
    }>;
  }) => {
    if (useEdgeFunction) {
      return postToEdge('close-orders', data);
    }

    const isMixedPayment = data.payments && data.payments.length > 0;
    const paymentMethodForOrders = isMixedPayment ? 'mixed' : data.payment_method;

    for (const orderId of data.order_ids) {
      await supabase
        .from('orders')
        .update({
          status: 'delivered',
          payment_method: paymentMethodForOrders,
          cash_received: data.cash_received || null,
          change_given: data.change_given || null,
          split_people: data.split_count || null,
          closed_at: new Date().toISOString(),
        })
        .eq('id', orderId);
    }

    // Save mixed payments to tab_payments table
    if (isMixedPayment && data.tab_id) {
      for (const payment of data.payments!) {
        const changeGiven = payment.method === 'cash' && payment.cashReceived && payment.cashReceived > payment.amount
          ? payment.cashReceived - payment.amount
          : null;
          
        await supabase
          .from('tab_payments')
          .insert({
            restaurant_id: restaurantId,
            tab_id: data.tab_id,
            payment_method: payment.method,
            amount: payment.amount,
            cash_received: payment.cashReceived || null,
            change_given: changeGiven,
          });
      }
    }

    if (data.table_id) {
      await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', data.table_id);
    }

    if (data.tab_id) {
      await supabase
        .from('tabs')
        .update({ status: 'available' })
        .eq('id', data.tab_id);
    }

    return { success: true };
  }, [restaurantId, useEdgeFunction, postToEdge]);

  const updateTab = useCallback(async (data: {
    tab_id: string;
    status: string;
    customer_name?: string | null;
    customer_phone?: string | null;
  }) => {
    if (useEdgeFunction) {
      return postToEdge('update-tab', data);
    }

    const { error } = await supabase
      .from('tabs')
      .update({
        status: data.status,
        customer_name: data.customer_name ?? null,
        customer_phone: data.customer_phone ?? null,
      })
      .eq('id', data.tab_id);

    if (error) throw error;
    return { success: true };
  }, [useEdgeFunction, postToEdge]);

  const createTab = useCallback(async (data: {
    number: number;
    customer_name?: string | null;
    customer_phone?: string | null;
    status?: string;
  }) => {
    if (useEdgeFunction) {
      return postToEdge('create-tab', data);
    }

    const { data: newTab, error } = await supabase
      .from('tabs')
      .insert({
        restaurant_id: restaurantId,
        number: data.number,
        customer_name: data.customer_name || null,
        customer_phone: data.customer_phone || null,
        status: data.status || 'occupied',
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, tab: newTab };
  }, [restaurantId, useEdgeFunction, postToEdge]);

  const updateTable = useCallback(async (data: {
    table_id: string;
    status: string;
  }) => {
    if (useEdgeFunction) {
      return postToEdge('update-table', data);
    }

    const { error } = await supabase
      .from('tables')
      .update({ status: data.status })
      .eq('id', data.table_id);

    if (error) throw error;
    return { success: true };
  }, [useEdgeFunction, postToEdge]);

  const createCustomer = useCallback(async (data: {
    name: string;
    phone: string;
    address?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    cep?: string;
  }) => {
    if (useEdgeFunction) {
      return postToEdge('create-customer', data);
    }

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        restaurant_id: restaurantId,
        name: data.name,
        phone: data.phone,
        address: data.address || null,
        number: data.number || null,
        complement: data.complement || null,
        neighborhood: data.neighborhood || null,
        city: data.city || null,
        cep: data.cep || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, customer: newCustomer };
  }, [restaurantId, useEdgeFunction, postToEdge]);

  const searchCustomers = useCallback(async (search: string) => {
    if (search.length < 2) return [];
    
    if (useEdgeFunction) {
      const result = await fetchFromEdge('search-customers', { search });
      return result.data || [];
    }

    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .or(`phone.ilike.%${search}%,name.ilike.%${search}%`)
      .limit(10);
    
    return data || [];
  }, [restaurantId, useEdgeFunction, fetchFromEdge]);

  const fetchTabTotal = useCallback(async (tabId: string) => {
    if (useEdgeFunction) {
      const result = await fetchFromEdge('tab-total', { tab_id: tabId });
      return result.total || 0;
    }
    const { data } = await supabase
      .from('orders')
      .select('total')
      .eq('restaurant_id', restaurantId)
      .eq('tab_id', tabId)
      .in('status', ['pending', 'preparing', 'ready', 'served']);
    return data?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
  }, [restaurantId, useEdgeFunction, fetchFromEdge]);

  return {
    loading,
    fetchTables,
    fetchTabs,
    fetchCategories,
    fetchProducts,
    fetchTableOrders,
    fetchTabOrders,
    fetchReadyOrders,
    fetchTableTotal,
    fetchTabTotal,
    createOrder,
    closeOrders,
    updateTab,
    createTab,
    updateTable,
    createCustomer,
    searchCustomers,
  };
}
