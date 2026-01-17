-- Tabela para configurações de NFC-e do restaurante
CREATE TABLE public.nfce_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  environment TEXT DEFAULT 'homologation' CHECK (environment IN ('homologation', 'production')),
  
  -- Dados fiscais
  inscricao_estadual TEXT,
  regime_tributario INTEGER DEFAULT 1, -- 1=Simples Nacional, 2=Simples Excesso, 3=Normal
  
  -- CSC (Código de Segurança do Contribuinte) - obrigatório para NFC-e
  csc_id TEXT,
  csc_token TEXT,
  
  -- Série e numeração
  serie_nfce INTEGER DEFAULT 1,
  numero_atual INTEGER DEFAULT 0,
  
  -- Certificado digital (referência ao arquivo no storage)
  certificado_url TEXT,
  certificado_senha TEXT, -- Será criptografado na edge function
  certificado_validade TIMESTAMP WITH TIME ZONE,
  
  -- Configurações de impressão
  auto_print_nfce BOOLEAN DEFAULT true,
  printer_id UUID REFERENCES public.printers(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT nfce_settings_restaurant_unique UNIQUE (restaurant_id)
);

-- Tabela para armazenar as notas fiscais emitidas
CREATE TABLE public.nfce_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id),
  
  -- Dados da nota
  numero INTEGER NOT NULL,
  serie INTEGER NOT NULL,
  chave_acesso TEXT, -- 44 dígitos
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'authorized', 'cancelled', 'rejected', 'contingency')),
  status_sefaz TEXT,
  motivo_sefaz TEXT,
  
  -- Valores
  valor_total NUMERIC(10,2) NOT NULL,
  valor_desconto NUMERIC(10,2) DEFAULT 0,
  valor_produtos NUMERIC(10,2) NOT NULL,
  
  -- Dados do consumidor (opcional para NFC-e)
  cpf_consumidor TEXT,
  nome_consumidor TEXT,
  
  -- Forma de pagamento na NF
  forma_pagamento TEXT, -- 01=Dinheiro, 02=Cheque, 03=Cartão Crédito, 04=Cartão Débito, 05=Crédito Loja, 10=VA, 11=VR, 12=Presente, 13=Combustível, 15=Boleto, 16=Sem Pagamento, 17=Falha Equipamento, 99=Outros
  
  -- XML e links
  xml_url TEXT,
  danfe_url TEXT,
  qrcode_url TEXT,
  
  -- Protocolo de autorização
  protocolo TEXT,
  data_emissao TIMESTAMP WITH TIME ZONE,
  data_autorizacao TIMESTAMP WITH TIME ZONE,
  
  -- Cancelamento
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancel_reason TEXT,
  cancel_protocol TEXT,
  
  -- API response
  focus_id TEXT, -- ID retornado pelo Focus NFe
  api_response JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_nfce_invoices_restaurant ON public.nfce_invoices(restaurant_id);
CREATE INDEX idx_nfce_invoices_order ON public.nfce_invoices(order_id);
CREATE INDEX idx_nfce_invoices_status ON public.nfce_invoices(status);
CREATE INDEX idx_nfce_invoices_chave ON public.nfce_invoices(chave_acesso);

-- RLS
ALTER TABLE public.nfce_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfce_invoices ENABLE ROW LEVEL SECURITY;

-- Policies para nfce_settings
CREATE POLICY "Users can view their restaurant nfce settings"
  ON public.nfce_settings
  FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their restaurant nfce settings"
  ON public.nfce_settings
  FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their restaurant nfce settings"
  ON public.nfce_settings
  FOR UPDATE
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Policies para nfce_invoices
CREATE POLICY "Users can view their restaurant invoices"
  ON public.nfce_invoices
  FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert invoices for their restaurant"
  ON public.nfce_invoices
  FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their restaurant invoices"
  ON public.nfce_invoices
  FOR UPDATE
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Triggers para updated_at
CREATE TRIGGER update_nfce_settings_updated_at
  BEFORE UPDATE ON public.nfce_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nfce_invoices_updated_at
  BEFORE UPDATE ON public.nfce_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket para certificados digitais
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Policy para upload de certificados
CREATE POLICY "Users can upload certificates for their restaurant"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'certificates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their certificates"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'certificates' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their certificates"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'certificates' AND auth.uid() IS NOT NULL);