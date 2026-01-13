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
import { Store, Power, PowerOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

  const handleToggleStore = async () => {
    if (!restaurant?.id) return;

    setLoading(true);
    try {
      const newIsOpen = !isOpen;
      
      // If opening the store, reset the daily order counter
      const updateData: { is_open: boolean; last_opened_at?: string; daily_order_counter?: number } = {
        is_open: newIsOpen,
      };

      if (newIsOpen) {
        updateData.last_opened_at = new Date().toISOString();
        updateData.daily_order_counter = 0;
      }

      const { error } = await supabase
        .from('salon_settings')
        .update(updateData)
        .eq('restaurant_id', restaurant.id);

      if (error) throw error;

      onStoreStatusChange(newIsOpen);
      toast.success(newIsOpen ? 'Loja aberta! Contador de pedidos reiniciado.' : 'Loja fechada com sucesso!');
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao alterar status da loja');
      console.error(error);
    } finally {
      setLoading(false);
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
        </div>

        <DialogFooter>
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
            {isOpen ? 'Fechar Loja' : 'Abrir Loja'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
