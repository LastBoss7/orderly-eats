import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio element for notification sound
  useEffect(() => {
    if (playSound && typeof window !== 'undefined') {
      // Create a simple beep sound using Web Audio API
      audioRef.current = new Audio();
      audioRef.current.volume = 0.5;
    }
  }, [playSound]);

  const playNotificationSound = useCallback(() => {
    if (!playSound) return;
    
    try {
      // Use Web Audio API to create a notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Second beep
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.frequency.value = 1000;
        oscillator2.type = 'sine';
        
        gainNode2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.5);
      }, 200);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
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
