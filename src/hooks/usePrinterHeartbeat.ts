import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { Tables } from '@/integrations/supabase/types';

type PrinterHeartbeat = Tables<'printer_heartbeats'>;

interface HeartbeatStatus {
  isConnected: boolean;
  lastSeen: Date | null;
  clientName: string | null;
  clientVersion: string | null;
  platform: string | null;
  isPrinting: boolean;
  pendingOrders: number;
  printersCount: number;
  timeSinceLastHeartbeat: number | null;
}

const HEARTBEAT_TIMEOUT_MS = 30000; // Consider disconnected after 30 seconds

export const usePrinterHeartbeat = (restaurantId?: string) => {
  const { profile } = useAuth();
  const effectiveRestaurantId = restaurantId || profile?.restaurant_id;
  const [heartbeats, setHeartbeats] = useState<PrinterHeartbeat[]>([]);
  const [status, setStatus] = useState<HeartbeatStatus>({
    isConnected: false,
    lastSeen: null,
    clientName: null,
    clientVersion: null,
    platform: null,
    isPrinting: false,
    pendingOrders: 0,
    printersCount: 0,
    timeSinceLastHeartbeat: null
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchHeartbeats = useCallback(async () => {
    if (!effectiveRestaurantId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('printer_heartbeats')
        .select('*')
        .eq('restaurant_id', effectiveRestaurantId)
        .order('last_heartbeat_at', { ascending: false });

      if (error) {
        console.error('Error fetching heartbeats:', error);
        throw error;
      }

      const typedData = (data || []) as PrinterHeartbeat[];
      setHeartbeats(typedData);

      // Calculate status based on most recent heartbeat
      if (typedData.length > 0) {
        const latest = typedData[0];
        const lastHeartbeatTime = new Date(latest.last_heartbeat_at);
        const now = new Date();
        const timeDiff = now.getTime() - lastHeartbeatTime.getTime();
        const isConnected = timeDiff < HEARTBEAT_TIMEOUT_MS;

        setStatus({
          isConnected,
          lastSeen: lastHeartbeatTime,
          clientName: latest.client_name,
          clientVersion: latest.client_version,
          platform: latest.platform,
          isPrinting: latest.is_printing ?? false,
          pendingOrders: latest.pending_orders ?? 0,
          printersCount: latest.printers_count ?? 0,
          timeSinceLastHeartbeat: Math.floor(timeDiff / 1000)
        });
      } else {
        setStatus({
          isConnected: false,
          lastSeen: null,
          clientName: null,
          clientVersion: null,
          platform: null,
          isPrinting: false,
          pendingOrders: 0,
          printersCount: 0,
          timeSinceLastHeartbeat: null
        });
      }
    } catch (err) {
      console.error('Error fetching heartbeats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveRestaurantId]);

  // Initial fetch and polling
  useEffect(() => {
    fetchHeartbeats();
    
    // Poll every 5 seconds to update status
    const pollInterval = setInterval(fetchHeartbeats, 5000);

    return () => clearInterval(pollInterval);
  }, [fetchHeartbeats]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!effectiveRestaurantId) return;

    const channel = supabase
      .channel(`printer-heartbeats-${effectiveRestaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'printer_heartbeats',
          filter: `restaurant_id=eq.${effectiveRestaurantId}`
        },
        () => {
          fetchHeartbeats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [effectiveRestaurantId, fetchHeartbeats]);

  // Update time since last heartbeat every second
  useEffect(() => {
    if (!status.lastSeen) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeDiff = now.getTime() - status.lastSeen!.getTime();
      const isConnected = timeDiff < HEARTBEAT_TIMEOUT_MS;

      setStatus(prev => ({
        ...prev,
        isConnected,
        timeSinceLastHeartbeat: Math.floor(timeDiff / 1000)
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [status.lastSeen]);

  return {
    heartbeats,
    status,
    isLoading,
    refetch: fetchHeartbeats
  };
};
