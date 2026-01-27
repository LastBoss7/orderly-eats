import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface IFoodSettings {
  id: string;
  restaurant_id: string;
  is_enabled: boolean;
  merchant_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  auto_accept_orders: boolean;
  sync_status: string;
  webhook_secret: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

interface IFoodOrder {
  id: string;
  restaurant_id: string;
  ifood_order_id: string;
  ifood_display_id: string | null;
  order_data: unknown;
  status: string;
  local_order_id: string | null;
  expires_at: string | null;
  rejection_reason: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  pickup_code: string | null;
  tracking_available: boolean | null;
  order_timing: string | null;
  order_type: string | null;
  delivered_by: string | null;
  scheduled_to: string | null;
  preparation_started_at: string | null;
  preparation_start_datetime: string | null;
  created_at: string;
  updated_at: string;
}

interface CancellationReason {
  code: string;
  description: string;
}

interface TrackingData {
  available: boolean;
  latitude?: number | null;
  longitude?: number | null;
  expectedDelivery?: string | null;
  pickupEtaStart?: number | null;
  deliveryEtaEnd?: number | null;
  trackDate?: string | null;
}

export function useIFoodIntegration() {
  const { restaurant } = useAuth();
  const [settings, setSettings] = useState<IFoodSettings | null>(null);
  const [pendingOrders, setPendingOrders] = useState<IFoodOrder[]>([]);
  const [allOrders, setAllOrders] = useState<IFoodOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('ifood_settings')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching iFood settings:', error);
    }
  }, [restaurant?.id]);

  // Fetch pending orders
  const fetchPendingOrders = useCallback(async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('ifood_orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingOrders((data || []) as IFoodOrder[]);
    } catch (error) {
      console.error('Error fetching iFood orders:', error);
    }
  }, [restaurant?.id]);

  // Fetch all active orders (not concluded/cancelled)
  const fetchAllOrders = useCallback(async () => {
    if (!restaurant?.id) return;

    try {
      const { data, error } = await supabase
        .from('ifood_orders')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .not('status', 'in', '("concluded","cancelled","rejected","returned")')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllOrders((data || []) as IFoodOrder[]);
    } catch (error) {
      console.error('Error fetching all iFood orders:', error);
    }
  }, [restaurant?.id]);

  // Initial load
  useEffect(() => {
    if (!restaurant?.id) return;

    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchSettings(), fetchPendingOrders(), fetchAllOrders()]);
      setIsLoading(false);
    };

    load();
  }, [restaurant?.id, fetchSettings, fetchPendingOrders, fetchAllOrders]);

  // Realtime subscription for orders
  useEffect(() => {
    if (!restaurant?.id) return;

    const channel = supabase
      .channel(`ifood-orders-${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ifood_orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as IFoodOrder;
            if (newOrder.status === 'pending') {
              setPendingOrders(prev => [newOrder, ...prev]);
              // Play notification sound
              const audio = new Audio('/sounds/ifood-notification.mp3');
              audio.play().catch(() => {});
              toast.info('🍔 Novo pedido iFood!', {
                description: `Pedido #${newOrder.ifood_display_id || 'Novo'}`,
                duration: 10000,
              });
            }
            setAllOrders(prev => [newOrder, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as IFoodOrder;
            if (updatedOrder.status !== 'pending') {
              setPendingOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
            } else {
              setPendingOrders(prev => 
                prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
              );
            }
            
            // Update or remove from allOrders based on status
            if (['concluded', 'cancelled', 'rejected', 'returned'].includes(updatedOrder.status)) {
              setAllOrders(prev => prev.filter(o => o.id !== updatedOrder.id));
            } else {
              setAllOrders(prev => 
                prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setPendingOrders(prev => prev.filter(o => o.id !== deletedId));
            setAllOrders(prev => prev.filter(o => o.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant?.id]);

  // Save settings
  const saveSettings = async (newSettings: Partial<IFoodSettings>) => {
    if (!restaurant?.id) return false;

    try {
      const { error } = await supabase
        .from('ifood_settings')
        .upsert({
          ...newSettings,
          restaurant_id: restaurant.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'restaurant_id',
        });

      if (error) throw error;
      await fetchSettings();
      toast.success('Configurações salvas!');
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
      return false;
    }
  };

  // Connect to iFood (get token)
  const connect = async () => {
    if (!restaurant?.id) return false;

    setIsConnecting(true);
    try {
      const response = await supabase.functions.invoke('ifood-auth?action=token', {
        body: { restaurant_id: restaurant.id },
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.error) throw response.error;

      if (response.data?.success) {
        await fetchSettings();
        toast.success('Conectado ao iFood!');
        return true;
      } else {
        throw new Error(response.data?.error || 'Falha na conexão');
      }
    } catch (error) {
      console.error('Error connecting to iFood:', error);
      toast.error('Erro ao conectar ao iFood');
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // Test connection
  const testConnection = async () => {
    if (!restaurant?.id) return false;

    try {
      const response = await supabase.functions.invoke('ifood-auth?action=test', {
        body: { restaurant_id: restaurant.id },
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.error) throw response.error;

      if (response.data?.success) {
        toast.success('Conexão OK!');
        return true;
      } else {
        throw new Error(response.data?.error || 'Conexão falhou');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Erro na conexão com iFood');
      return false;
    }
  };

  // Accept order
  const acceptOrder = async (ifoodOrderId: string) => {
    if (!restaurant?.id) return false;

    try {
      const response = await supabase.functions.invoke('ifood-orders?action=accept', {
        body: { restaurant_id: restaurant.id, ifood_order_id: ifoodOrderId },
        method: 'POST',
      });

      if (response.error) throw response.error;

      if (response.data?.success) {
        toast.success('Pedido aceito!');
        return true;
      } else {
        throw new Error(response.data?.error || 'Erro ao aceitar pedido');
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('Erro ao aceitar pedido');
      return false;
    }
  };

  // Reject order
  const rejectOrder = async (ifoodOrderId: string, reason?: string) => {
    if (!restaurant?.id) return false;

    try {
      const response = await supabase.functions.invoke('ifood-orders?action=reject', {
        body: { restaurant_id: restaurant.id, ifood_order_id: ifoodOrderId, reason },
        method: 'POST',
      });

      if (response.error) throw response.error;

      if (response.data?.success) {
        toast.success('Pedido recusado');
        return true;
      } else {
        throw new Error(response.data?.error || 'Erro ao recusar pedido');
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error('Erro ao recusar pedido');
      return false;
    }
  };

  // Start preparation
  const startPreparation = async (ifoodOrderId: string) => {
    if (!restaurant?.id) return false;

    try {
      const response = await supabase.functions.invoke('ifood-orders?action=startPreparation', {
        body: { restaurant_id: restaurant.id, ifood_order_id: ifoodOrderId },
        method: 'POST',
      });

      if (response.error) throw response.error;

      if (response.data?.success) {
        toast.success('Preparo iniciado!');
        return true;
      } else {
        throw new Error(response.data?.error || 'Erro ao iniciar preparo');
      }
    } catch (error) {
      console.error('Error starting preparation:', error);
      toast.error('Erro ao iniciar preparo');
      return false;
    }
  };

  // Mark order ready
  const markReady = async (ifoodOrderId: string) => {
    if (!restaurant?.id) return false;

    try {
      const response = await supabase.functions.invoke('ifood-orders?action=ready', {
        body: { restaurant_id: restaurant.id, ifood_order_id: ifoodOrderId },
        method: 'POST',
      });

      if (response.error) throw response.error;

      if (response.data?.success) {
        toast.success('Pedido pronto para retirada!');
        return true;
      } else {
        throw new Error(response.data?.error || 'Erro ao marcar como pronto');
      }
    } catch (error) {
      console.error('Error marking ready:', error);
      toast.error('Erro ao marcar como pronto');
      return false;
    }
  };

  // Dispatch order
  const dispatchOrder = async (ifoodOrderId: string) => {
    if (!restaurant?.id) return false;

    try {
      const response = await supabase.functions.invoke('ifood-orders?action=dispatch', {
        body: { restaurant_id: restaurant.id, ifood_order_id: ifoodOrderId },
        method: 'POST',
      });

      if (response.error) throw response.error;

      if (response.data?.success) {
        toast.success('Pedido despachado!');
        return true;
      } else {
        throw new Error(response.data?.error || 'Erro ao despachar pedido');
      }
    } catch (error) {
      console.error('Error dispatching order:', error);
      toast.error('Erro ao despachar pedido');
      return false;
    }
  };

  // Get cancellation reasons
  const getCancellationReasons = async (ifoodOrderId: string): Promise<CancellationReason[]> => {
    if (!restaurant?.id) return [];

    try {
      const response = await supabase.functions.invoke('ifood-orders?action=getCancellationReasons', {
        body: { restaurant_id: restaurant.id, ifood_order_id: ifoodOrderId },
        method: 'POST',
      });

      if (response.error) throw response.error;
      return response.data?.reasons || [];
    } catch (error) {
      console.error('Error getting cancellation reasons:', error);
      return [];
    }
  };

  // Request cancellation
  const requestCancellation = async (ifoodOrderId: string, cancellationCode: string, reason?: string) => {
    if (!restaurant?.id) return false;

    try {
      const response = await supabase.functions.invoke('ifood-orders?action=requestCancellation', {
        body: { 
          restaurant_id: restaurant.id, 
          ifood_order_id: ifoodOrderId,
          cancellation_code: cancellationCode,
          reason,
        },
        method: 'POST',
      });

      if (response.error) throw response.error;

      if (response.data?.success) {
        toast.success('Cancelamento solicitado');
        return true;
      } else {
        throw new Error(response.data?.error || 'Erro ao solicitar cancelamento');
      }
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      toast.error('Erro ao solicitar cancelamento');
      return false;
    }
  };

  // Get tracking
  const getTracking = async (ifoodOrderId: string): Promise<TrackingData | null> => {
    if (!restaurant?.id) return null;

    try {
      const response = await supabase.functions.invoke('ifood-orders?action=getTracking', {
        body: { restaurant_id: restaurant.id, ifood_order_id: ifoodOrderId },
        method: 'POST',
      });

      if (response.error) throw response.error;
      return response.data || null;
    } catch (error) {
      console.error('Error getting tracking:', error);
      return null;
    }
  };

  // Validate pickup code
  const validatePickupCode = async (ifoodOrderId: string, code: string): Promise<boolean> => {
    if (!restaurant?.id) return false;

    try {
      const response = await supabase.functions.invoke('ifood-orders?action=validatePickupCode', {
        body: { restaurant_id: restaurant.id, ifood_order_id: ifoodOrderId, pickup_code: code },
        method: 'POST',
      });

      if (response.error) throw response.error;

      if (response.data?.valid) {
        toast.success('Código validado!');
        return true;
      } else {
        toast.error('Código inválido');
        return false;
      }
    } catch (error) {
      console.error('Error validating pickup code:', error);
      toast.error('Erro ao validar código');
      return false;
    }
  };

  // Poll for new orders (fallback)
  const pollOrders = async () => {
    if (!restaurant?.id) return;

    try {
      const response = await supabase.functions.invoke('ifood-orders?action=polling', {
        body: { restaurant_id: restaurant.id },
        method: 'POST',
      });

      if (response.data?.processed > 0) {
        toast.info(`${response.data.processed} novo(s) pedido(s) sincronizado(s)`);
      }
    } catch (error) {
      console.error('Error polling orders:', error);
    }
  };

  return {
    settings,
    pendingOrders,
    allOrders,
    isLoading,
    isConnecting,
    saveSettings,
    connect,
    testConnection,
    acceptOrder,
    rejectOrder,
    startPreparation,
    markReady,
    dispatchOrder,
    getCancellationReasons,
    requestCancellation,
    getTracking,
    validatePickupCode,
    pollOrders,
    refreshSettings: fetchSettings,
    refreshOrders: fetchPendingOrders,
  };
}
