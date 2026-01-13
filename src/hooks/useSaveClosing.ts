import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

interface ClosingData {
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  cancelledOrders: number;
  paymentBreakdown: {
    method: string;
    count: number;
    total: number;
  }[];
  orderTypeBreakdown: {
    type: string;
    count: number;
    total: number;
  }[];
  notes?: string;
}

export function useSaveClosing() {
  const { user, profile } = useAuth();

  const saveClosing = async (data: ClosingData) => {
    if (!profile?.restaurant_id) {
      toast.error('Restaurante não encontrado');
      return false;
    }

    try {
      const today = new Date().toISOString().split('T')[0];

      // Convert arrays to objects for JSONB storage
      const paymentBreakdownObj: Record<string, { count: number; total: number }> = {};
      data.paymentBreakdown.forEach(p => {
        // Use original method key if available
        const methodKey = Object.entries({
          pix: 'PIX',
          credit: 'Cartão de Crédito',
          debit: 'Cartão de Débito',
          cash: 'Dinheiro',
          voucher: 'Vale Refeição',
        }).find(([_, label]) => label === p.method)?.[0] || p.method;
        
        paymentBreakdownObj[methodKey] = { count: p.count, total: p.total };
      });

      const orderTypeBreakdownObj: Record<string, { count: number; total: number }> = {};
      data.orderTypeBreakdown.forEach(t => {
        // Use original type key if available
        const typeKey = Object.entries({
          counter: 'Balcão',
          table: 'Mesa',
          delivery: 'Delivery',
          takeaway: 'Para Levar',
        }).find(([_, label]) => label === t.type)?.[0] || t.type;
        
        orderTypeBreakdownObj[typeKey] = { count: t.count, total: t.total };
      });

      const { error } = await supabase
        .from('daily_closings')
        .upsert({
          restaurant_id: profile.restaurant_id,
          closing_date: today,
          total_revenue: data.totalRevenue,
          total_orders: data.totalOrders,
          average_ticket: data.averageTicket,
          cancelled_orders: data.cancelledOrders,
          payment_breakdown: paymentBreakdownObj,
          order_type_breakdown: orderTypeBreakdownObj,
          closed_by: user?.id,
          notes: data.notes,
        }, {
          onConflict: 'restaurant_id,closing_date',
        });

      if (error) throw error;

      toast.success('Fechamento salvo no histórico');
      return true;
    } catch (error) {
      console.error('Error saving closing:', error);
      toast.error('Erro ao salvar fechamento');
      return false;
    }
  };

  return { saveClosing };
}
