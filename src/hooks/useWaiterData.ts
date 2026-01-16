import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/waiter-data`;

interface UseWaiterDataOptions {
  restaurantId: string;
  useEdgeFunction?: boolean;
}

export function useWaiterData({ restaurantId, useEdgeFunction = false }: UseWaiterDataOptions) {
  const [loading, setLoading] = useState(false);

  const fetchFromEdge = useCallback(async (action: string, params: Record<string, string> = {}) => {
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
      throw new Error('Failed to fetch data');
    }

    return response.json();
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

  const fetchProducts = useCallback(async () => {
    if (useEdgeFunction) {
      const result = await fetchFromEdge('products');
      return result.data || [];
    }
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('name');
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
  }) => {
    if (useEdgeFunction) {
      return postToEdge('close-orders', data);
    }

    for (const orderId of data.order_ids) {
      await supabase
        .from('orders')
        .update({
          status: 'delivered',
          payment_method: data.payment_method,
          cash_received: data.cash_received || null,
          change_given: data.change_given || null,
          closed_at: new Date().toISOString(),
        })
        .eq('id', orderId);
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
    createOrder,
    closeOrders,
  };
}
