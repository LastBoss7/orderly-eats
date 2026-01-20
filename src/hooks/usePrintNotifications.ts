import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePrintNotifications = (restaurantId: string | null) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('print-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const oldPrintStatus = (payload.old as any)?.print_status;
          const newPrintStatus = (payload.new as any)?.print_status;
          const orderNumber = (payload.new as any)?.order_number;
          const orderType = (payload.new as any)?.order_type;

          // Only show notification when print_status EXPLICITLY changes to 'printed'
          // Must have both old and new values, and they must be different
          const printStatusActuallyChanged = 
            oldPrintStatus !== undefined && 
            newPrintStatus !== undefined &&
            oldPrintStatus !== newPrintStatus &&
            newPrintStatus === 'printed';

          if (printStatusActuallyChanged) {
            const typeLabel = 
              orderType === 'table' ? 'Mesa' :
              orderType === 'counter' ? 'Balcão' :
              orderType === 'delivery' ? 'Delivery' :
              orderType === 'tab' ? 'Comanda' : 'Pedido';

            toast({
              title: '🖨️ Pedido Impresso',
              description: `${typeLabel} #${orderNumber || 'N/A'} foi impresso com sucesso`,
              duration: 4000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, toast]);
};
