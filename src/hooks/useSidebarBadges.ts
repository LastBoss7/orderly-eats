import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

const STORAGE_KEY = 'lastViewedDeliveries';

export function useSidebarBadges() {
  const { profile } = useAuth();
  const [newDeliveriesCount, setNewDeliveriesCount] = useState(0);
  const [lastViewedAt, setLastViewedAt] = useState<Date>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Date(stored) : new Date();
  });

  const markDeliveriesAsViewed = useCallback(() => {
    const now = new Date();
    setLastViewedAt(now);
    localStorage.setItem(STORAGE_KEY, now.toISOString());
    setNewDeliveriesCount(0);
  }, []);

  const fetchUnviewedCount = useCallback(async () => {
    if (!profile?.restaurant_id) return;

    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', profile.restaurant_id)
      .eq('order_type', 'delivery')
      .gt('created_at', lastViewedAt.toISOString());

    if (!error && count !== null) {
      setNewDeliveriesCount(count);
    }
  }, [profile?.restaurant_id, lastViewedAt]);

  // Initial fetch
  useEffect(() => {
    fetchUnviewedCount();
  }, [fetchUnviewedCount]);

  // Subscribe to realtime new orders
  useEffect(() => {
    if (!profile?.restaurant_id) return;

    const channel = supabase
      .channel(`sidebar-badges-${profile.restaurant_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${profile.restaurant_id}`,
        },
        (payload) => {
          const newOrder = payload.new as { order_type?: string };
          if (newOrder.order_type === 'delivery') {
            setNewDeliveriesCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.restaurant_id]);

  return {
    newDeliveriesCount,
    markDeliveriesAsViewed,
  };
}
