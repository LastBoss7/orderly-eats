import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface PrintOrderOptions {
  orderId: string;
  orderNumber?: number | string | null;
  showToast?: boolean;
}

interface ReprintOrderOptions {
  orderId: string;
  orderNumber?: number | string | null;
}

/**
 * Hook para enviar impressões para o app Electron
 * Em vez de usar window.print(), este hook marca o pedido como pendente
 * para que o app Electron possa buscá-lo e imprimir na impressora térmica
 */
export function usePrintToElectron() {
  const { restaurant } = useAuth();

  /**
   * Marca um pedido para impressão (print_status = 'pending')
   * O app Electron vai buscar e imprimir automaticamente
   */
  const printOrder = useCallback(async ({ orderId, orderNumber, showToast = true }: PrintOrderOptions) => {
    if (!restaurant?.id) {
      toast.error('Restaurante não identificado');
      return false;
    }

    try {
      // Update order to pending print status
      const { error } = await supabase
        .from('orders')
        .update({ 
          print_status: 'pending',
          printed_at: null, // Reset printed time
        })
        .eq('id', orderId);

      if (error) throw error;

      // Log the print request
      await supabase.from('print_logs').insert({
        restaurant_id: restaurant.id,
        order_id: orderId,
        order_number: orderNumber?.toString() || null,
        event_type: 'print',
        status: 'pending',
        printer_name: 'Electron App',
      });

      if (showToast) {
        toast.success('Pedido enviado para impressão!', {
          description: 'O app Electron irá imprimir automaticamente.',
        });
      }

      return true;
    } catch (error: any) {
      console.error('Error sending print to Electron:', error);
      toast.error('Erro ao enviar para impressão', {
        description: error.message,
      });
      return false;
    }
  }, [restaurant?.id]);

  /**
   * Reimprime um pedido (marca novamente como pending)
   */
  const reprintOrder = useCallback(async ({ orderId, orderNumber }: ReprintOrderOptions) => {
    if (!restaurant?.id) {
      toast.error('Restaurante não identificado');
      return false;
    }

    try {
      // Increment print count and set back to pending
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('print_count')
        .eq('id', orderId)
        .single();

      const newPrintCount = (currentOrder?.print_count || 0) + 1;

      const { error } = await supabase
        .from('orders')
        .update({ 
          print_status: 'pending',
          print_count: newPrintCount,
          printed_at: null,
        })
        .eq('id', orderId);

      if (error) throw error;

      // Log the reprint request
      await supabase.from('print_logs').insert({
        restaurant_id: restaurant.id,
        order_id: orderId,
        order_number: orderNumber?.toString() || null,
        event_type: 'reprint',
        status: 'pending',
        printer_name: 'Electron App',
      });

      toast.success('Reimpressão enviada!', {
        description: `Pedido será reimpresso (${newPrintCount}ª via)`,
      });

      return true;
    } catch (error: any) {
      console.error('Error sending reprint to Electron:', error);
      toast.error('Erro ao reimprimir', {
        description: error.message,
      });
      return false;
    }
  }, [restaurant?.id]);

  /**
   * Imprime conferência/conta de mesa ou comanda
   * Cria um pedido temporário com type='conference' para impressão
   */
  const printConference = useCallback(async (params: {
    entityType: 'table' | 'tab';
    entityNumber: number;
    customerName?: string | null;
    items: Array<{
      product_name: string;
      quantity: number;
      product_price: number;
    }>;
    total: number;
    discount?: number;
    addition?: number;
    splitCount?: number;
  }) => {
    if (!restaurant?.id) {
      toast.error('Restaurante não identificado');
      return false;
    }

    try {
      // Create a temporary order for the conference print
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant.id,
          order_type: 'conference',
          customer_name: params.customerName || `${params.entityType === 'table' ? 'Mesa' : 'Comanda'} ${params.entityNumber}`,
          total: params.total,
          status: 'conference', // Special status for conference prints
          print_status: 'pending',
          notes: JSON.stringify({
            entityType: params.entityType,
            entityNumber: params.entityNumber,
            discount: params.discount || 0,
            addition: params.addition || 0,
            splitCount: params.splitCount || 1,
            isConference: true,
          }),
        })
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // Add items to the order
      if (params.items.length > 0) {
        const itemsToInsert = params.items.map(item => ({
          order_id: order.id,
          restaurant_id: restaurant.id,
          product_name: item.product_name,
          product_price: item.product_price,
          quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Log the conference print
      await supabase.from('print_logs').insert({
        restaurant_id: restaurant.id,
        order_id: order.id,
        order_number: order.order_number?.toString() || null,
        event_type: 'print',
        status: 'pending',
        printer_name: 'Electron App',
        items_count: params.items.length,
      });

      toast.success('Conferência enviada para impressão!');

      // Delete the temporary order after 60 seconds (Electron should have printed it)
      setTimeout(async () => {
        try {
          await supabase.from('order_items').delete().eq('order_id', order.id);
          await supabase.from('orders').delete().eq('id', order.id);
        } catch (e) {
          console.log('Conference order cleanup:', e);
        }
      }, 60000);

      return true;
    } catch (error: any) {
      console.error('Error sending conference to Electron:', error);
      toast.error('Erro ao enviar conferência', {
        description: error.message,
      });
      return false;
    }
  }, [restaurant?.id]);

  return {
    printOrder,
    reprintOrder,
    printConference,
  };
}
