import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { playDoubleBell, playAlertBell } from '@/lib/restaurantBell';
import { useAuth } from '@/lib/auth';

interface OrderNotification {
  id: string;
  orderNumber: string;
  type: 'new' | 'delayed';
  timestamp: Date;
}

interface SoundSettings {
  sound_enabled: boolean;
  sound_delivery: boolean;
  sound_table: boolean;
  sound_counter: boolean;
  sound_takeaway: boolean;
}

export function useOrderNotifications(restaurantId: string | undefined) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [soundSettings, setSoundSettings] = useState<SoundSettings>({
    sound_enabled: true,
    sound_delivery: true,
    sound_table: true,
    sound_counter: true,
    sound_takeaway: true,
  });
  const processedOrdersRef = useRef<Set<string>>(new Set());

  // Fetch sound settings
  useEffect(() => {
    if (!restaurantId) return;

    const fetchSettings = async () => {
      const { data } = await supabase
        .from('salon_settings')
        .select('sound_enabled, sound_delivery, sound_table, sound_counter, sound_takeaway')
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (data) {
        setSoundSettings({
          sound_enabled: data.sound_enabled ?? true,
          sound_delivery: data.sound_delivery ?? true,
          sound_table: data.sound_table ?? true,
          sound_counter: data.sound_counter ?? true,
          sound_takeaway: data.sound_takeaway ?? true,
        });
      }
    };

    fetchSettings();
  }, [restaurantId]);

  const shouldPlaySound = useCallback((orderType: string | null): boolean => {
    if (!soundSettings.sound_enabled) return false;
    
    switch (orderType) {
      case 'delivery':
        return soundSettings.sound_delivery;
      case 'table':
        return soundSettings.sound_table;
      case 'counter':
        return soundSettings.sound_counter;
      case 'takeaway':
        return soundSettings.sound_takeaway;
      default:
        return true; // Play for unknown types
    }
  }, [soundSettings]);

  const playNotificationSound = useCallback(() => {
    if (soundSettings.sound_enabled) {
      playDoubleBell(0.6);
    }
  }, [soundSettings.sound_enabled]);

  const playAlertSound = useCallback(() => {
    if (soundSettings.sound_enabled) {
      playAlertBell(0.7);
    }
  }, [soundSettings.sound_enabled]);

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

          // Ignore temporary orders (conference, closing)
          if (order.order_type === 'conference' || order.order_type === 'closing') {
            return;
          }

          // Ignore orders created by current user (they already see "Pedido criado" toast)
          if (order.created_by && user?.id && order.created_by === user.id) {
            return;
          }

          // Check if sound should play for this order type
          if (shouldPlaySound(order.order_type)) {
            playDoubleBell(0.6);
          }
          
          const orderNumber = order.order_number || order.id.slice(0, 4).toUpperCase();
          
          toast({
            title: '🔔 Novo Pedido!',
            description: `Pedido #${orderNumber} recebido`,
            duration: 5000,
          });

          addNotification({
            id: order.id,
            orderNumber: String(orderNumber),
            type: 'new',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, user?.id, shouldPlaySound, toast, addNotification]);

  // Check for delayed orders periodically
  useEffect(() => {
    if (!restaurantId) return;

    const checkDelayedOrders = async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: delayedOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurantId)
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

  const toggleSound = useCallback(async () => {
    const newValue = !soundSettings.sound_enabled;
    setSoundSettings(prev => ({ ...prev, sound_enabled: newValue }));
    
    // Persist to database
    if (restaurantId) {
      await supabase
        .from('salon_settings')
        .update({ sound_enabled: newValue })
        .eq('restaurant_id', restaurantId);
    }
  }, [soundSettings.sound_enabled, restaurantId]);

  return {
    notifications,
    soundEnabled: soundSettings.sound_enabled,
    toggleSound,
    clearNotification,
    playNotificationSound,
    playAlertSound,
  };
}
