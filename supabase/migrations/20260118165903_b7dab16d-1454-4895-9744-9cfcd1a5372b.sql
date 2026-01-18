
-- =====================================================
-- CORREÇÃO DE SEGURANÇA - PROBLEMAS CRÍTICOS RESTANTES
-- =====================================================

-- 1. PROFILES - Restringir acesso a dados pessoais
-- Apenas o próprio usuário pode ver seu perfil completo
DROP POLICY IF EXISTS "Users can view profiles in their restaurant" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Política: usuário vê apenas seu próprio perfil
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

-- Política: super admins podem ver todos
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING (is_super_admin(auth.uid()));

-- 2. CUSTOMERS - Restringir acesso a managers/admins
DROP POLICY IF EXISTS "Users can view customers in their restaurant" ON public.customers;
DROP POLICY IF EXISTS "Users can manage customers in their restaurant" ON public.customers;
DROP POLICY IF EXISTS "Waiters can view customers in their restaurant" ON public.customers;
DROP POLICY IF EXISTS "Waiters can create customers in their restaurant" ON public.customers;
DROP POLICY IF EXISTS "Waiters can update customers in their restaurant" ON public.customers;

-- Apenas admins/managers podem ver todos os clientes
CREATE POLICY "Managers can view customers"
ON public.customers FOR SELECT
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'manager')
  )
);

-- Managers podem gerenciar clientes
CREATE POLICY "Managers can manage customers"
ON public.customers FOR ALL
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'manager')
  )
);

-- Garçons podem apenas criar clientes (para delivery)
CREATE POLICY "Waiters can create customers"
ON public.customers FOR INSERT
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id FROM waiters 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- 3. WAITERS - Criar view segura que oculta dados sensíveis
CREATE OR REPLACE VIEW public.waiters_safe
WITH (security_invoker = true) AS
SELECT 
  id,
  restaurant_id,
  name,
  status,
  created_at,
  updated_at
  -- Exclui: email, phone, pin, pin_hash, pin_salt, user_id
FROM public.waiters;

-- Restringir políticas da tabela waiters
DROP POLICY IF EXISTS "Users can view waiters in their restaurant" ON public.waiters;
DROP POLICY IF EXISTS "Users can manage waiters in their restaurant" ON public.waiters;
DROP POLICY IF EXISTS "Waiters can view their own record" ON public.waiters;

-- Apenas admins/managers podem ver dados completos de garçons
CREATE POLICY "Managers can view all waiter data"
ON public.waiters FOR SELECT
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'manager')
  )
);

-- Garçom pode ver apenas seus próprios dados
CREATE POLICY "Waiters can view own record"
ON public.waiters FOR SELECT
USING (user_id = auth.uid());

-- Apenas admins podem gerenciar garçons
CREATE POLICY "Admins can manage waiters"
ON public.waiters FOR ALL
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
);

-- 4. NFCE_SETTINGS - Restringir a apenas admins
DROP POLICY IF EXISTS "Users can view their restaurant nfce settings" ON public.nfce_settings;
DROP POLICY IF EXISTS "Users can update their restaurant nfce settings" ON public.nfce_settings;
DROP POLICY IF EXISTS "Users can insert their restaurant nfce settings" ON public.nfce_settings;

-- Criar view segura que oculta credenciais
CREATE OR REPLACE VIEW public.nfce_settings_safe
WITH (security_invoker = true) AS
SELECT 
  id,
  restaurant_id,
  is_enabled,
  environment,
  regime_tributario,
  inscricao_estadual,
  serie_nfce,
  numero_atual,
  auto_print_nfce,
  printer_id,
  -- Campos sensíveis são mascarados
  CASE WHEN certificado_url IS NOT NULL THEN '***configured***' ELSE NULL END as certificado_status,
  certificado_validade,
  CASE WHEN csc_id IS NOT NULL THEN '***configured***' ELSE NULL END as csc_status,
  created_at,
  updated_at
  -- Exclui: certificado_senha, csc_token, certificado_url, csc_id
FROM public.nfce_settings;

-- Apenas admins podem acessar configurações NFCe completas
CREATE POLICY "Admins can view nfce settings"
ON public.nfce_settings FOR SELECT
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can manage nfce settings"
ON public.nfce_settings FOR ALL
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
);

-- 5. NFCE_INVOICES - Criar view que oculta CPF
CREATE OR REPLACE VIEW public.nfce_invoices_safe
WITH (security_invoker = true) AS
SELECT 
  id,
  restaurant_id,
  order_id,
  numero,
  serie,
  status,
  status_sefaz,
  motivo_sefaz,
  valor_total,
  valor_produtos,
  valor_desconto,
  forma_pagamento,
  -- CPF mascarado
  CASE 
    WHEN cpf_consumidor IS NOT NULL 
    THEN CONCAT('***', RIGHT(cpf_consumidor, 3))
    ELSE NULL 
  END as cpf_masked,
  nome_consumidor,
  chave_acesso,
  protocolo,
  danfe_url,
  qrcode_url,
  data_emissao,
  data_autorizacao,
  cancelled_at,
  cancel_reason,
  created_at,
  updated_at
  -- Exclui: cpf_consumidor completo, xml_url, api_response
FROM public.nfce_invoices;

-- Restringir acesso a invoices
DROP POLICY IF EXISTS "Users can view their restaurant invoices" ON public.nfce_invoices;
DROP POLICY IF EXISTS "Users can update their restaurant invoices" ON public.nfce_invoices;
DROP POLICY IF EXISTS "Users can insert invoices for their restaurant" ON public.nfce_invoices;

-- Apenas admins/managers podem ver notas fiscais
CREATE POLICY "Managers can view invoices"
ON public.nfce_invoices FOR SELECT
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'manager')
  )
);

CREATE POLICY "Admins can manage invoices"
ON public.nfce_invoices FOR ALL
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
);

-- 6. ORDERS - Remover acesso público via print_status
DROP POLICY IF EXISTS "Anyone can read pending orders for printing" ON public.orders;
DROP POLICY IF EXISTS "Printer service update print status only" ON public.orders;

-- Criar função para verificar se é chamada de serviço de impressão
-- O serviço de impressão usa edge functions com service role
-- Não precisa de política pública

-- 7. ADMIN_RESTAURANT_METRICS - Já usa security_invoker, mas precisa de RLS nas tabelas base
-- As políticas das tabelas base já restringem acesso
-- Adicionar verificação explícita de super_admin
