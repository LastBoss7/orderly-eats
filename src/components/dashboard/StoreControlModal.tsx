import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Store, Power, PowerOff, Loader2, FileText, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { fetchDailyReportData } from './PrintDailyReport';
import { useSaveClosing } from '@/hooks/useSaveClosing';
import { usePrintToElectron } from '@/hooks/usePrintToElectron';

interface StoreControlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOpen: boolean;
  onStoreStatusChange: (isOpen: boolean) => void;
}

export function StoreControlModal({ 
  open, 
  onOpenChange, 
  isOpen,
  onStoreStatusChange 
}: StoreControlModalProps) {
  const { restaurant } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resettingCounter, setResettingCounter] = useState(false);
  const { saveClosing } = useSaveClosing();
  const { printClosing } = usePrintToElectron();

  const handleToggleStore = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      const newIsOpen = !isOpen;
      
      // Check if salon_settings exists for this restaurant
      const { data: existingSettings } = await supabase
        .from('salon_settings')
        .select('id, last_opened_at')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      // If closing the store, print the daily report first and save to history
      if (!newIsOpen && existingSettings) {
        // Fetch and print daily report via Electron
        const reportData = await fetchDailyReportData(
          restaurant.id,
          restaurant.name,
          existingSettings.last_opened_at || null
        );
        
        // Send to Electron for thermal printing
        await printClosing(reportData);

        // Save closing to history
        await saveClosing({
          totalRevenue: reportData.totalRevenue,
          totalOrders: reportData.totalOrders,
          averageTicket: reportData.averageTicket,
          cancelledOrders: reportData.cancelledOrders,
          paymentBreakdown: reportData.paymentBreakdown,
          orderTypeBreakdown: reportData.orderTypeBreakdown,
        });
      }
      
      // Prepare update data
      const updateData: { 
        restaurant_id: string;
        is_open: boolean; 
        last_opened_at?: string; 
        daily_order_counter?: number 
      } = {
        restaurant_id: restaurant.id,
        is_open: newIsOpen,
      };

      if (newIsOpen) {
        updateData.last_opened_at = new Date().toISOString();
        updateData.daily_order_counter = 0;
      }

      let error;
      
      if (existingSettings) {
        // Update existing record
        const result = await supabase
          .from('salon_settings')
          .update({
            is_open: updateData.is_open,
            last_opened_at: updateData.last_opened_at,
            daily_order_counter: updateData.daily_order_counter,
          })
          .eq('restaurant_id', restaurant.id);
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from('salon_settings')
          .insert(updateData);
        error = result.error;
      }

      if (error) throw error;

      onStoreStatusChange(newIsOpen);
      toast.success(
        newIsOpen 
          ? 'Loja aberta! Contador de pedidos reiniciado.' 
          : 'Loja fechada! Relatório de conferência impresso.'
      );
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao alterar status da loja:', error);
      const errorMessage = error?.message || 'Erro desconhecido';
      const errorCode = error?.code || '';
      toast.error('Erro ao alterar status da loja', {
        description: `${errorMessage}${errorCode ? ` (Código: ${errorCode})` : ''}`,
        duration: 8000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReport = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      const { data: settings } = await supabase
        .from('salon_settings')
        .select('last_opened_at')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle();

      const reportData = await fetchDailyReportData(
        restaurant.id,
        restaurant.name,
        settings?.last_opened_at || null
      );
      
      // Send to Electron for thermal printing
      await printClosing(reportData);
    } catch (error: any) {
      console.error('Erro ao gerar relatório:', error);
      const errorMessage = error?.message || 'Erro desconhecido';
      toast.error('Erro ao gerar relatório', {
        description: errorMessage,
        duration: 8000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetCounter = async () => {
    if (!restaurant?.id) return;

    setResettingCounter(true);
    try {
      const { error } = await supabase
        .from('salon_settings')
        .update({ daily_order_counter: 0 })
        .eq('restaurant_id', restaurant.id);

      if (error) throw error;

      toast.success('Contador de pedidos resetado para #01!');
    } catch (error: any) {
      console.error('Erro ao resetar contador:', error);
      toast.error('Erro ao resetar contador', {
        description: error?.message || 'Erro desconhecido',
      });
    } finally {
      setResettingCounter(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="w-5 h-5" />
            Controle da Loja
          </DialogTitle>
          <DialogDescription>
            {isOpen 
              ? 'A loja está aberta e recebendo pedidos.'
              : 'A loja está fechada. Abra para começar a receber pedidos.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className={`flex flex-col items-center justify-center p-8 rounded-lg border-2 ${
            isOpen 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-muted border-muted-foreground/20'
          }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              isOpen ? 'bg-green-500 text-white' : 'bg-muted-foreground/20 text-muted-foreground'
            }`}>
              {isOpen ? <Power className="w-8 h-8" /> : <PowerOff className="w-8 h-8" />}
            </div>
            <span className={`text-xl font-semibold ${isOpen ? 'text-green-600' : 'text-muted-foreground'}`}>
              {isOpen ? 'LOJA ABERTA' : 'LOJA FECHADA'}
            </span>
            {isOpen && (
              <span className="text-sm text-muted-foreground mt-2">
                Contador de pedidos ativo
              </span>
            )}
          </div>

          {/* Action buttons (only when store is open) */}
          {isOpen && (
            <div className="flex flex-col gap-2 mt-4">
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={handlePrintReport}
                disabled={loading || resettingCounter}
              >
                <FileText className="w-4 h-4" />
                Imprimir Relatório Parcial
              </Button>
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={handleResetCounter}
                disabled={loading || resettingCounter}
              >
                {resettingCounter ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Resetar Contador de Pedidos
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant={isOpen ? 'destructive' : 'default'}
            onClick={handleToggleStore}
            disabled={loading}
            className={!isOpen ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : isOpen ? (
              <PowerOff className="w-4 h-4 mr-2" />
            ) : (
              <Power className="w-4 h-4 mr-2" />
            )}
            {isOpen ? 'Fechar Loja e Imprimir Relatório' : 'Abrir Loja'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
