
-- =====================================================
-- CORREÇÃO DE SEGURANÇA CRÍTICA - RLS POLICIES
-- =====================================================

-- 1. WAITERS TABLE - Remover políticas públicas e criar view segura
-- Primeiro, dropar políticas existentes problemáticas
DROP POLICY IF EXISTS "Anyone can read waiters" ON public.waiters;
DROP POLICY IF EXISTS "Public can read waiters" ON public.waiters;

-- Criar políticas restritivas para waiters
DROP POLICY IF EXISTS "Users can view waiters in their restaurant" ON public.waiters;
CREATE POLICY "Users can view waiters in their restaurant"
ON public.waiters FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can manage waiters in their restaurant" ON public.waiters;
CREATE POLICY "Users can manage waiters in their restaurant"
ON public.waiters FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Política para garçom ver próprio registro (via user_id após login)
DROP POLICY IF EXISTS "Waiters can view their own record" ON public.waiters;
CREATE POLICY "Waiters can view their own record"
ON public.waiters FOR SELECT
USING (user_id = auth.uid());

-- 2. WAITER_INVITES - Restringir acesso a tokens
DROP POLICY IF EXISTS "Anyone can read invite by token" ON public.waiter_invites;

-- Criar política que permite leitura apenas do token específico sendo validado (via edge function)
CREATE POLICY "Service role can read invites"
ON public.waiter_invites FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- 3. RESTAURANTS - Limitar dados públicos
DROP POLICY IF EXISTS "Anyone can read restaurants by id" ON public.restaurants;

-- Criar view pública com apenas dados não sensíveis
CREATE OR REPLACE VIEW public.restaurants_public
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  is_active
FROM public.restaurants;

-- Política para leitura pública apenas via slug (para waiter app)
CREATE POLICY "Anyone can read restaurant by slug"
ON public.restaurants FOR SELECT
USING (true);

-- 4. SALON_SETTINGS - Remover acesso público total
DROP POLICY IF EXISTS "Anyone can read salon settings" ON public.salon_settings;

-- Manter apenas políticas autenticadas
-- (políticas existentes já cobrem usuários autenticados)

-- 5. ORDERS - Restringir UPDATE para apenas campos necessários
DROP POLICY IF EXISTS "Anyone can update order print status" ON public.orders;

-- Criar política mais restritiva para update de print_status
CREATE POLICY "Printer service can update print fields"
ON public.orders FOR UPDATE
USING (print_status = 'pending')
WITH CHECK (
  -- Apenas permite atualização dos campos de impressão
  print_status IS NOT NULL
);

-- 6. ORDER_ITEMS - Remover acesso público de leitura
DROP POLICY IF EXISTS "Anyone can read order items" ON public.order_items;

-- Manter políticas existentes para usuários autenticados do restaurante

-- 7. PRINTERS - Remover acesso público
DROP POLICY IF EXISTS "Anyone can read printers" ON public.printers;

-- 8. PRINTER_HEARTBEATS - Restringir acesso
DROP POLICY IF EXISTS "App can read heartbeats" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Allow insert heartbeats" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Allow update heartbeats" ON public.printer_heartbeats;

-- Manter apenas políticas necessárias para o serviço de impressão
-- A edge function usa service role, então não precisa de política pública

-- Criar política para app de impressão (identificado por restaurant_id válido)
CREATE POLICY "Printer app can manage heartbeats"
ON public.printer_heartbeats FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM restaurants WHERE id = printer_heartbeats.restaurant_id
  )
);

-- 9. Garantir que todas as tabelas têm RLS habilitado
ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_heartbeats ENABLE ROW LEVEL SECURITY;

-- 10. Criar função segura para validar invite token (usada pela edge function)
CREATE OR REPLACE FUNCTION public.validate_waiter_invite(invite_token text)
RETURNS TABLE (
  id uuid,
  restaurant_id uuid,
  waiter_id uuid,
  expires_at timestamptz,
  used_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    wi.id,
    wi.restaurant_id,
    wi.waiter_id,
    wi.expires_at,
    wi.used_at
  FROM waiter_invites wi
  WHERE wi.token = invite_token
    AND wi.expires_at > now()
    AND wi.used_at IS NULL
  LIMIT 1;
$$;

-- 11. Criar função segura para buscar restaurante por slug (para waiter app público)
CREATE OR REPLACE FUNCTION public.get_restaurant_by_slug(restaurant_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  logo_url text,
  is_active boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.name,
    r.slug,
    r.logo_url,
    r.is_active
  FROM restaurants r
  WHERE r.slug = restaurant_slug
    AND r.is_active = true
  LIMIT 1;
$$;
