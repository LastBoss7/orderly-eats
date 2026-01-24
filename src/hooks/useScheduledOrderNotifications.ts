import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { playScheduleReminder, playScheduleUrgent } from '@/lib/restaurantBell';
import { differenceInMinutes, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ScheduledOrderAlert {
  orderId: string;
  orderNumber: number;
  scheduledAt: string;
  minutesUntil: number;
  customerName?: string;
}

interface UseScheduledOrderNotificationsOptions {
  restaurantId: string | undefined;
  soundEnabled?: boolean;
  alertMinutesBefore?: number; // Default 15 minutes
  urgentMinutesBefore?: number; // Default 5 minutes
}

export function useScheduledOrderNotifications({
  restaurantId,
  soundEnabled = true,
  alertMinutesBefore = 15,
  urgentMinutesBefore = 5,
}: UseScheduledOrderNotificationsOptions) {
  const { toast } = useToast();
  const [upcomingOrders, setUpcomingOrders] = useState<ScheduledOrderAlert[]>([]);
  const notifiedOrdersRef = useRef<Map<string, Set<'alert' | 'urgent'>>>(new Map());
  const lastCheckRef = useRef<Date>(new Date());

  const checkScheduledOrders = useCallback(async () => {
    if (!restaurantId) return;

    try {
      const now = new Date();
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, order_number, scheduled_at, customer_name, status')
        .eq('restaurant_id', restaurantId)
        .not('scheduled_at', 'is', null)
        .eq('status', 'pending')
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('Error checking scheduled orders:', error);
        return;
      }

      const upcoming: ScheduledOrderAlert[] = [];

      orders?.forEach((order) => {
        if (!order.scheduled_at) return;

        const scheduledTime = parseISO(order.scheduled_at);
        const minutesUntil = differenceInMinutes(scheduledTime, now);

        // Only consider orders within the next hour
        if (minutesUntil > 60 || minutesUntil < -5) return;

        upcoming.push({
          orderId: order.id,
          orderNumber: order.order_number || 0,
          scheduledAt: order.scheduled_at,
          minutesUntil,
          customerName: order.customer_name || undefined,
        });

        // Get or create notification set for this order
        if (!notifiedOrdersRef.current.has(order.id)) {
          notifiedOrdersRef.current.set(order.id, new Set());
        }
        const notified = notifiedOrdersRef.current.get(order.id)!;

        // Check for urgent notification (< 5 minutes)
        if (minutesUntil <= urgentMinutesBefore && minutesUntil > -1 && !notified.has('urgent')) {
          notified.add('urgent');

          if (soundEnabled) {
            playScheduleUrgent(0.7);
          }

          const timeStr = format(scheduledTime, "HH:mm", { locale: ptBR });

          toast({
            variant: 'destructive',
            title: '⏰ Pedido Agendado URGENTE!',
            description: `Pedido #${order.order_number}${order.customer_name ? ` - ${order.customer_name}` : ''} às ${timeStr} (em ${minutesUntil <= 0 ? 'AGORA' : `${minutesUntil} min`})`,
            duration: 15000,
          });
        }
        // Check for regular alert (< 15 minutes)
        else if (minutesUntil <= alertMinutesBefore && minutesUntil > urgentMinutesBefore && !notified.has('alert')) {
          notified.add('alert');

          if (soundEnabled) {
            playScheduleReminder(0.6);
          }

          const timeStr = format(scheduledTime, "HH:mm", { locale: ptBR });

          toast({
            title: '📅 Pedido Agendado se Aproximando',
            description: `Pedido #${order.order_number}${order.customer_name ? ` - ${order.customer_name}` : ''} às ${timeStr} (em ${minutesUntil} min)`,
            duration: 10000,
          });
        }
      });

      setUpcomingOrders(upcoming);

      // Clean up old entries (orders more than 30 minutes past their scheduled time)
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      notifiedOrdersRef.current.forEach((_, orderId) => {
        const order = orders?.find(o => o.id === orderId);
        if (order?.scheduled_at) {
          const scheduledTime = parseISO(order.scheduled_at);
          if (scheduledTime < thirtyMinutesAgo) {
            notifiedOrdersRef.current.delete(orderId);
          }
        }
      });

      lastCheckRef.current = now;
    } catch (error) {
      console.error('Error in checkScheduledOrders:', error);
    }
  }, [restaurantId, soundEnabled, alertMinutesBefore, urgentMinutesBefore, toast]);

  // Initial check and interval
  useEffect(() => {
    if (!restaurantId) return;

    // Check immediately
    checkScheduledOrders();

    // Check every minute
    const interval = setInterval(checkScheduledOrders, 60 * 1000);

    return () => clearInterval(interval);
  }, [restaurantId, checkScheduledOrders]);

  // Subscribe to realtime changes on orders
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`scheduled-orders-notifications-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          // Re-check scheduled orders when any order changes
          checkScheduledOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, checkScheduledOrders]);

  const clearNotification = useCallback((orderId: string) => {
    notifiedOrdersRef.current.delete(orderId);
    setUpcomingOrders(prev => prev.filter(o => o.orderId !== orderId));
  }, []);

  const getNextScheduledOrder = useCallback(() => {
    return upcomingOrders[0] || null;
  }, [upcomingOrders]);

  return {
    upcomingOrders,
    clearNotification,
    getNextScheduledOrder,
    refreshScheduledOrders: checkScheduledOrders,
  };
}
