import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

interface LogPrintParams {
  orderId: string;
  orderNumber?: string | number | null;
  printerName?: string | null;
  itemsCount?: number;
  status?: 'success' | 'error';
  errorMessage?: string | null;
  eventType?: 'print' | 'reprint' | 'auto_print';
}

export function usePrintLogs() {
  const { restaurant } = useAuth();

  const logPrint = useCallback(async ({
    orderId,
    orderNumber,
    printerName = 'Navegador',
    itemsCount = 0,
    status = 'success',
    errorMessage = null,
    eventType = 'print',
  }: LogPrintParams) => {
    if (!restaurant?.id) return null;

    try {
      const { data, error } = await supabase
        .from('print_logs')
        .insert({
          restaurant_id: restaurant.id,
          order_id: orderId,
          order_number: orderNumber?.toString() || null,
          printer_name: printerName,
          items_count: itemsCount,
          status,
          error_message: errorMessage,
          event_type: eventType,
        })
        .select()
        .single();

      if (error) {
        console.error('Error logging print:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error logging print:', error);
      return null;
    }
  }, [restaurant?.id]);

  return { logPrint };
}
