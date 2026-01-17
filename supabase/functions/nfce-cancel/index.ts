import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FOCUS_API_URL_PROD = 'https://api.focusnfe.com.br';
const FOCUS_API_URL_HOMOLOG = 'https://homologacao.focusnfe.com.br';

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const focusToken = Deno.env.get('FOCUS_NFE_TOKEN');

    if (!focusToken) {
      throw new Error('FOCUS_NFE_TOKEN não configurado');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { invoice_id, justificativa } = await req.json();

    if (!invoice_id) {
      throw new Error('invoice_id é obrigatório');
    }

    if (!justificativa || justificativa.length < 15) {
      throw new Error('Justificativa deve ter no mínimo 15 caracteres');
    }

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('nfce_invoices')
      .select('*')
      .eq('id', invoice_id)
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Nota não encontrada: ${invoiceError?.message}`);
    }

    if (invoice.status !== 'authorized') {
      throw new Error('Apenas notas autorizadas podem ser canceladas');
    }

    // Fetch NFC-e settings
    const { data: nfceSettings } = await supabase
      .from('nfce_settings')
      .select('environment')
      .eq('restaurant_id', invoice.restaurant_id)
      .single();

    const apiUrl = nfceSettings?.environment === 'production' 
      ? FOCUS_API_URL_PROD 
      : FOCUS_API_URL_HOMOLOG;

    console.log(`[NFC-e Cancel] Cancelando nota ${invoice.focus_id}`);

    // Send cancel request to Focus NFe
    const focusResponse = await fetch(`${apiUrl}/v2/nfce/${invoice.focus_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${btoa(focusToken + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        justificativa: justificativa,
      }),
    });

    const focusResult = await focusResponse.json();

    console.log(`[NFC-e Cancel] Resposta Focus:`, JSON.stringify(focusResult));

    // Update invoice
    const updateData: any = {
      api_response: focusResult,
    };

    if (focusResult.status === 'cancelado') {
      updateData.status = 'cancelled';
      updateData.cancelled_at = new Date().toISOString();
      updateData.cancel_reason = justificativa;
      updateData.cancel_protocol = focusResult.protocolo;
    }

    await supabase
      .from('nfce_invoices')
      .update(updateData)
      .eq('id', invoice_id);

    return new Response(
      JSON.stringify({
        success: focusResult.status === 'cancelado',
        focus_response: focusResult,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('[NFC-e Cancel] Erro:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
