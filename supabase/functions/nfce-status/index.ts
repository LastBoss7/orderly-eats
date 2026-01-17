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

    const { invoice_id } = await req.json();

    if (!invoice_id) {
      throw new Error('invoice_id é obrigatório');
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

    // Fetch NFC-e settings to determine environment
    const { data: nfceSettings } = await supabase
      .from('nfce_settings')
      .select('environment')
      .eq('restaurant_id', invoice.restaurant_id)
      .single();

    const apiUrl = nfceSettings?.environment === 'production' 
      ? FOCUS_API_URL_PROD 
      : FOCUS_API_URL_HOMOLOG;

    // Query Focus NFe for status
    const focusResponse = await fetch(`${apiUrl}/v2/nfce/${invoice.focus_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(focusToken + ':')}`,
      },
    });

    const focusResult = await focusResponse.json();

    console.log(`[NFC-e Status] Resposta Focus:`, JSON.stringify(focusResult));

    // Update invoice based on response
    let invoiceStatus = invoice.status;
    let updateData: any = { api_response: focusResult };

    if (focusResult.status === 'autorizado') {
      invoiceStatus = 'authorized';
      updateData = {
        ...updateData,
        status: 'authorized',
        status_sefaz: focusResult.status_sefaz,
        motivo_sefaz: focusResult.mensagem_sefaz,
        chave_acesso: focusResult.chave_nfe,
        protocolo: focusResult.protocolo,
        danfe_url: focusResult.caminho_danfe,
        qrcode_url: focusResult.qrcode_url,
        data_autorizacao: new Date().toISOString(),
      };
    } else if (focusResult.status === 'cancelado') {
      invoiceStatus = 'cancelled';
      updateData = {
        ...updateData,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      };
    } else if (focusResult.status === 'erro_autorizacao') {
      invoiceStatus = 'rejected';
      updateData = {
        ...updateData,
        status: 'rejected',
        status_sefaz: focusResult.status_sefaz,
        motivo_sefaz: focusResult.mensagem_sefaz || focusResult.erros?.join(', '),
      };
    }

    // Update in database
    const { error: updateError } = await supabase
      .from('nfce_invoices')
      .update(updateData)
      .eq('id', invoice_id);

    if (updateError) {
      console.error('[NFC-e Status] Erro ao atualizar:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: invoiceStatus,
        focus_response: focusResult,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('[NFC-e Status] Erro:', error);
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
