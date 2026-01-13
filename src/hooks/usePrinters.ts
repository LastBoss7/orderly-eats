import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface Printer {
  id: string;
  restaurant_id: string;
  name: string;
  model: string | null;
  printer_name: string | null;
  status: string;
  paper_width: number;
  linked_order_types: string[];
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePrinters() {
  const { profile } = useAuth();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrinters = useCallback(async () => {
    if (!profile?.restaurant_id) return;

    try {
      const { data, error } = await supabase
        .from('printers')
        .select('*')
        .eq('restaurant_id', profile.restaurant_id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setPrinters(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar impressoras:', err);
      toast.error('Erro ao carregar impressoras');
    } finally {
      setLoading(false);
    }
  }, [profile?.restaurant_id]);

  useEffect(() => {
    fetchPrinters();
  }, [fetchPrinters]);

  const addPrinter = async (printerData: Omit<Printer, 'id' | 'restaurant_id' | 'status' | 'last_seen_at' | 'created_at' | 'updated_at'>) => {
    if (!profile?.restaurant_id) {
      toast.error('Restaurante não encontrado');
      return false;
    }

    try {
      const { error } = await supabase.from('printers').insert({
        ...printerData,
        restaurant_id: profile.restaurant_id,
      });

      if (error) throw error;

      toast.success('Impressora adicionada!');
      await fetchPrinters();
      return true;
    } catch (err: any) {
      console.error('Erro ao adicionar impressora:', err);
      toast.error('Erro ao adicionar impressora: ' + err.message);
      return false;
    }
  };

  const updatePrinter = async (id: string, printerData: Partial<Printer>) => {
    try {
      const { error } = await supabase
        .from('printers')
        .update(printerData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Impressora atualizada!');
      await fetchPrinters();
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar impressora:', err);
      toast.error('Erro ao atualizar impressora: ' + err.message);
      return false;
    }
  };

  const deletePrinter = async (id: string) => {
    try {
      const { error } = await supabase.from('printers').delete().eq('id', id);

      if (error) throw error;

      toast.success('Impressora removida!');
      await fetchPrinters();
      return true;
    } catch (err: any) {
      console.error('Erro ao remover impressora:', err);
      toast.error('Erro ao remover impressora: ' + err.message);
      return false;
    }
  };

  return {
    printers,
    loading,
    addPrinter,
    updatePrinter,
    deletePrinter,
    refetch: fetchPrinters,
  };
}
