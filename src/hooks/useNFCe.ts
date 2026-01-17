import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmitNFCeOptions {
  orderId: string;
  cpfConsumidor?: string;
  nomeConsumidor?: string;
}

interface NFCeResult {
  success: boolean;
  invoice?: any;
  error?: string;
}

export function useNFCe() {
  const [loading, setLoading] = useState(false);

  const emitNFCe = async (options: EmitNFCeOptions): Promise<NFCeResult> => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('nfce-emit', {
        body: {
          order_id: options.orderId,
          cpf_consumidor: options.cpfConsumidor,
          nome_consumidor: options.nomeConsumidor,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao emitir NFC-e');
      }

      // Check status
      if (data.invoice?.status === 'authorized') {
        toast.success('NFC-e emitida com sucesso!');
      } else if (data.invoice?.status === 'processing') {
        toast.info('NFC-e em processamento...');
      } else if (data.invoice?.status === 'rejected') {
        toast.error(`NFC-e rejeitada: ${data.invoice.motivo_sefaz}`);
      }

      return {
        success: data.success,
        invoice: data.invoice,
      };

    } catch (error: any) {
      console.error('Erro ao emitir NFC-e:', error);
      toast.error('Erro ao emitir NFC-e: ' + (error.message || 'Erro desconhecido'));
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (invoiceId: string): Promise<NFCeResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('nfce-status', {
        body: { invoice_id: invoiceId },
      });

      if (error) throw error;

      return {
        success: data.success,
        invoice: data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const cancelNFCe = async (invoiceId: string, justificativa: string): Promise<NFCeResult> => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('nfce-cancel', {
        body: {
          invoice_id: invoiceId,
          justificativa,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success('NFC-e cancelada com sucesso!');
      } else {
        throw new Error(data.error || 'Erro ao cancelar NFC-e');
      }

      return {
        success: data.success,
      };
    } catch (error: any) {
      toast.error('Erro ao cancelar NFC-e: ' + error.message);
      return {
        success: false,
        error: error.message,
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    emitNFCe,
    checkStatus,
    cancelNFCe,
  };
}
