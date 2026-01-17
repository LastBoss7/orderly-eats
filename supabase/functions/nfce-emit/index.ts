import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Focus NFe API endpoints
const FOCUS_API_URL_PROD = 'https://api.focusnfe.com.br';
const FOCUS_API_URL_HOMOLOG = 'https://homologacao.focusnfe.com.br';

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  notes?: string;
}

interface EmitNFCeRequest {
  order_id: string;
  cpf_consumidor?: string;
  nome_consumidor?: string;
}

interface NFCeProduct {
  numero_item: string;
  codigo_produto: string;
  descricao: string;
  codigo_ncm: string;
  cfop: string;
  unidade_comercial: string;
  quantidade_comercial: string;
  valor_unitario_comercial: string;
  valor_bruto: string;
  unidade_tributavel: string;
  quantidade_tributavel: string;
  valor_unitario_tributavel: string;
  icms_origem: string;
  icms_situacao_tributaria: string;
  icms_aliquota?: string;
  icms_base_calculo?: string;
  icms_valor?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
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

    const { order_id, cpf_consumidor, nome_consumidor }: EmitNFCeRequest = await req.json();

    if (!order_id) {
      throw new Error('order_id é obrigatório');
    }

    console.log(`[NFC-e] Iniciando emissão para pedido: ${order_id}`);

    // Fetch order data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      throw new Error(`Pedido não encontrado: ${orderError?.message}`);
    }

    console.log(`[NFC-e] Pedido encontrado: #${order.order_number}, Total: R$ ${order.total}`);

    // Fetch restaurant data
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', order.restaurant_id)
      .single();

    if (restError || !restaurant) {
      throw new Error(`Restaurante não encontrado: ${restError?.message}`);
    }

    // Fetch NFC-e settings
    const { data: nfceSettings, error: settingsError } = await supabase
      .from('nfce_settings')
      .select('*')
      .eq('restaurant_id', order.restaurant_id)
      .single();

    if (settingsError || !nfceSettings) {
      throw new Error('Configurações de NFC-e não encontradas. Configure primeiro em Configurações → NFC-e');
    }

    if (!nfceSettings.is_enabled) {
      throw new Error('Emissão de NFC-e está desativada');
    }

    if (!nfceSettings.inscricao_estadual) {
      throw new Error('Inscrição Estadual não configurada');
    }

    if (!nfceSettings.csc_id || !nfceSettings.csc_token) {
      throw new Error('CSC não configurado');
    }

    // Determine API URL based on environment
    const apiUrl = nfceSettings.environment === 'production' 
      ? FOCUS_API_URL_PROD 
      : FOCUS_API_URL_HOMOLOG;

    // Increment invoice number
    const nextNumber = (nfceSettings.numero_atual || 0) + 1;

    // Build products array for NFC-e
    const produtos: NFCeProduct[] = order.order_items.map((item: OrderItem, index: number) => ({
      numero_item: String(index + 1),
      codigo_produto: item.id.substring(0, 8),
      descricao: item.product_name.substring(0, 120),
      codigo_ncm: '21069090', // NCM padrão para alimentos preparados
      cfop: '5102', // Venda de mercadoria
      unidade_comercial: 'UN',
      quantidade_comercial: String(item.quantity),
      valor_unitario_comercial: item.product_price.toFixed(2),
      valor_bruto: (item.product_price * item.quantity).toFixed(2),
      unidade_tributavel: 'UN',
      quantidade_tributavel: String(item.quantity),
      valor_unitario_tributavel: item.product_price.toFixed(2),
      // ICMS para Simples Nacional
      icms_origem: '0',
      icms_situacao_tributaria: nfceSettings.regime_tributario <= 2 ? '102' : '00', // 102=SN sem crédito, 00=tributado integral
    }));

    // Map payment method
    const paymentMethodMap: Record<string, string> = {
      'dinheiro': '01',
      'pix': '17',
      'credito': '03',
      'debito': '04',
      'vale_refeicao': '11',
      'vale_alimentacao': '10',
    };

    const formaPagamento = paymentMethodMap[order.payment_method || 'dinheiro'] || '99';

    // Build NFC-e payload for Focus NFe
    const nfcePayload = {
      // Natureza da operação
      natureza_operacao: 'VENDA',
      
      // Dados do emitente (já cadastrado no Focus)
      cnpj_emitente: restaurant.cnpj?.replace(/\D/g, ''),
      
      // Dados do destinatário (opcional para NFC-e)
      ...(cpf_consumidor && {
        cpf_destinatario: cpf_consumidor.replace(/\D/g, ''),
        nome_destinatario: nome_consumidor || 'CONSUMIDOR',
      }),
      
      // Local de entrega/venda
      local_destino: '1', // 1=Operação interna
      
      // Tipo de documento
      tipo_documento: '1', // 1=Saída
      
      // Finalidade
      finalidade_emissao: '1', // 1=Normal
      
      // Consumidor final
      consumidor_final: '1', // 1=Sim
      
      // Presença do comprador
      presenca_comprador: '1', // 1=Presencial
      
      // Produtos
      items: produtos,
      
      // Formas de pagamento
      formas_pagamento: [{
        forma_pagamento: formaPagamento,
        valor_pagamento: order.total.toFixed(2),
      }],
      
      // Valores totais
      valor_produtos: order.total.toFixed(2),
      valor_total: order.total.toFixed(2),
      
      // Informações adicionais
      informacoes_adicionais_contribuinte: `Pedido #${order.order_number}`,
    };

    console.log(`[NFC-e] Enviando para Focus NFe (${nfceSettings.environment})`);

    // Create reference ID for the invoice
    const refId = `${order.restaurant_id.substring(0, 8)}-${nextNumber}`;

    // Send to Focus NFe API
    const focusResponse = await fetch(`${apiUrl}/v2/nfce?ref=${refId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(focusToken + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(nfcePayload),
    });

    const focusResult = await focusResponse.json();

    console.log(`[NFC-e] Resposta Focus NFe:`, JSON.stringify(focusResult));

    // Determine status based on response
    let invoiceStatus = 'pending';
    let statusSefaz = '';
    let motivoSefaz = '';
    let chaveAcesso = '';
    let protocolo = '';
    let danfeUrl = '';
    let qrcodeUrl = '';

    if (focusResult.status === 'autorizado') {
      invoiceStatus = 'authorized';
      statusSefaz = focusResult.status_sefaz;
      motivoSefaz = focusResult.mensagem_sefaz;
      chaveAcesso = focusResult.chave_nfe;
      protocolo = focusResult.protocolo;
      danfeUrl = focusResult.caminho_danfe;
      qrcodeUrl = focusResult.qrcode_url;
    } else if (focusResult.status === 'processando_autorizacao') {
      invoiceStatus = 'processing';
    } else if (focusResult.status === 'erro_autorizacao') {
      invoiceStatus = 'rejected';
      statusSefaz = focusResult.status_sefaz;
      motivoSefaz = focusResult.mensagem_sefaz || focusResult.erros?.join(', ');
    }

    // Save invoice to database
    const { data: invoice, error: insertError } = await supabase
      .from('nfce_invoices')
      .insert({
        restaurant_id: order.restaurant_id,
        order_id: order.id,
        numero: nextNumber,
        serie: nfceSettings.serie_nfce,
        chave_acesso: chaveAcesso,
        status: invoiceStatus,
        status_sefaz: statusSefaz,
        motivo_sefaz: motivoSefaz,
        valor_total: order.total,
        valor_produtos: order.total,
        cpf_consumidor: cpf_consumidor,
        nome_consumidor: nome_consumidor,
        forma_pagamento: formaPagamento,
        danfe_url: danfeUrl,
        qrcode_url: qrcodeUrl,
        protocolo: protocolo,
        data_emissao: new Date().toISOString(),
        data_autorizacao: invoiceStatus === 'authorized' ? new Date().toISOString() : null,
        focus_id: refId,
        api_response: focusResult,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[NFC-e] Erro ao salvar nota:', insertError);
      throw new Error(`Erro ao salvar nota fiscal: ${insertError.message}`);
    }

    // Update invoice number counter
    await supabase
      .from('nfce_settings')
      .update({ numero_atual: nextNumber })
      .eq('restaurant_id', order.restaurant_id);

    console.log(`[NFC-e] Nota salva com sucesso: ${invoice.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        invoice: invoice,
        focus_response: focusResult,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('[NFC-e] Erro:', error);
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
