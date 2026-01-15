import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRestaurantBell } from './useRestaurantBell';

interface OrderNotification {
  id: string;
  orderNumber: string;
  type: 'new' | 'delayed';
  timestamp: Date;
}

export function useOrderNotifications(restaurantId: string | undefined) {
  const { toast } = useToast();
  const { playBell, playDoubleBell, playAlertBell } = useRestaurantBell();
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const processedOrdersRef = useRef<Set<string>>(new Set());

  const playNotificationSound = useCallback(() => {
    if (soundEnabled) {
      playDoubleBell(0.6);
    }
  }, [soundEnabled, playDoubleBell]);

  const playAlertSound = useCallback(() => {
    if (soundEnabled) {
      playAlertBell(0.7);
    }
  }, [soundEnabled, playAlertBell]);

  const addNotification = useCallback((notification: Omit<OrderNotification, 'timestamp'>) => {
    setNotifications(prev => [
      { ...notification, timestamp: new Date() },
      ...prev.slice(0, 9) // Keep last 10 notifications
    ]);
  }, []);

  // Subscribe to realtime order changes
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('orders-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const order = payload.new as any;
          
          // Avoid duplicate notifications
          if (processedOrdersRef.current.has(order.id)) return;
          processedOrdersRef.current.add(order.id);

          // Play sound and show toast
          playNotificationSound();
          
          const orderNumber = order.id.slice(0, 4).toUpperCase();
          
          toast({
            title: '🔔 Novo Pedido!',
            description: `Pedido #${orderNumber} recebido`,
            duration: 5000,
          });

          addNotification({
            id: order.id,
            orderNumber,
            type: 'new',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, playNotificationSound, toast, addNotification]);

  // Check for delayed orders periodically
  useEffect(() => {
    if (!restaurantId) return;

    const checkDelayedOrders = async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: delayedOrders } = await supabase
        .from('orders')
        .select('id')
        .in('status', ['pending', 'preparing'])
        .lt('created_at', thirtyMinutesAgo);

      if (delayedOrders && delayedOrders.length > 0) {
        // Play alert sound for delayed orders
        playAlertSound();
        
        toast({
          variant: 'destructive',
          title: '⚠️ Pedidos Atrasados!',
          description: `${delayedOrders.length} pedido(s) há mais de 30 minutos`,
          duration: 10000,
        });
      }
    };

    // Check immediately and every 5 minutes
    checkDelayedOrders();
    const interval = setInterval(checkDelayedOrders, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [restaurantId, playAlertSound, toast]);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  return {
    notifications,
    soundEnabled,
    toggleSound,
    clearNotification,
    playNotificationSound,
    playAlertSound,
  };
}
