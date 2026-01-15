import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { playDoubleBell } from '@/lib/restaurantBell';

interface UseDeliveryNotificationsOptions {
  restaurantId?: string;
  enabled?: boolean;
  onNewOrder?: (order: any) => void;
  playSound?: boolean;
}

export function useDeliveryNotifications({
  restaurantId,
  enabled = true,
  onNewOrder,
  playSound = true,
}: UseDeliveryNotificationsOptions) {
  const { toast } = useToast();

  const playNotificationSound = useCallback(() => {
    if (!playSound) return;
    playDoubleBell(0.6);
  }, [playSound]);

  useEffect(() => {
    if (!enabled || !restaurantId) return;

    const channel = supabase
      .channel('delivery-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const newOrder = payload.new as any;
          
          // Only notify for delivery orders
          if (newOrder.order_type === 'delivery') {
            playNotificationSound();
            
            toast({
              title: '🛵 Novo Pedido de Entrega!',
              description: `Pedido para ${newOrder.customer_name || 'Cliente'}`,
              duration: 10000,
            });

            onNewOrder?.(newOrder);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as any;
          const oldOrder = payload.old as any;
          
          // Notify on status changes for delivery orders
          if (updatedOrder.order_type === 'delivery' && oldOrder.status !== updatedOrder.status) {
            const statusLabels: Record<string, string> = {
              pending: 'Pendente',
              preparing: 'Preparando',
              ready: 'Pronto para entrega',
              delivering: 'Saiu para entrega',
              delivered: 'Entregue',
              cancelled: 'Cancelado',
            };
            
            toast({
              title: `📦 Pedido Atualizado`,
              description: `${updatedOrder.customer_name || 'Pedido'}: ${statusLabels[updatedOrder.status] || updatedOrder.status}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, restaurantId, onNewOrder, playNotificationSound, toast]);

  return {
    playNotificationSound,
  };
}
