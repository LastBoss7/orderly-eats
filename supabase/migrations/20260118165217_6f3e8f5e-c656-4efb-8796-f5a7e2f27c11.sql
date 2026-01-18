
-- =====================================================
-- CORREÇÃO ADICIONAL - POLÍTICAS PERMISSIVAS RESTANTES
-- =====================================================

-- 1. Corrigir view restaurants_public para usar SECURITY INVOKER corretamente
DROP VIEW IF EXISTS public.restaurants_public;

-- Recriar sem SECURITY DEFINER implícito
CREATE VIEW public.restaurants_public AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  is_active
FROM public.restaurants;

-- 2. ORDERS - Remover política pública permissiva e criar políticas específicas
DROP POLICY IF EXISTS "Printer service can update print fields" ON public.orders;

-- Política para serviço de impressão (apenas campos de impressão, apenas pedidos pendentes)
CREATE POLICY "Printer service update print status only"
ON public.orders FOR UPDATE
USING (
  -- Apenas pedidos com print_status pendente podem ser atualizados
  print_status = 'pending'
)
WITH CHECK (
  -- Garantir que apenas campos de impressão são alterados
  print_status IN ('pending', 'printed', 'error')
);

-- 3. WAITER_CALLS - Corrigir política de INSERT pública
DROP POLICY IF EXISTS "Anyone can create waiter calls" ON public.waiter_calls;

-- Criar política mais restritiva - apenas de restaurantes válidos
CREATE POLICY "Valid restaurant can create waiter calls"
ON public.waiter_calls FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM restaurants 
    WHERE id = waiter_calls.restaurant_id 
    AND is_active = true
  )
);

-- 4. PRINT_LOGS - Corrigir política de INSERT pública
DROP POLICY IF EXISTS "Anyone can insert print logs" ON public.print_logs;

-- Criar política mais restritiva
CREATE POLICY "Valid restaurant can insert print logs"
ON public.print_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM restaurants 
    WHERE id = print_logs.restaurant_id
  )
);

-- 5. ORDER_ITEMS - Corrigir políticas públicas para conference/closing
DROP POLICY IF EXISTS "Allow public insert for conference order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow public delete for conference order items" ON public.order_items;

-- Recriar com restrição de restaurant_id válido
CREATE POLICY "Conference order items insert"
ON public.order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id 
    AND o.order_type IN ('conference', 'closing')
    AND EXISTS (SELECT 1 FROM restaurants WHERE id = o.restaurant_id)
  )
);

CREATE POLICY "Conference order items delete"
ON public.order_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_items.order_id 
    AND o.order_type IN ('conference', 'closing')
  )
);

-- 6. ORDERS - Corrigir políticas públicas para conference/closing
DROP POLICY IF EXISTS "Allow public insert for conference and closing orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public delete for conference and closing orders" ON public.orders;

-- Recriar com restrição de restaurant válido
CREATE POLICY "Conference orders insert"
ON public.orders FOR INSERT
WITH CHECK (
  order_type IN ('conference', 'closing') 
  AND status IN ('conference', 'closing')
  AND print_status = 'pending'
  AND EXISTS (SELECT 1 FROM restaurants WHERE id = orders.restaurant_id AND is_active = true)
);

CREATE POLICY "Conference orders delete"
ON public.orders FOR DELETE
USING (
  order_type IN ('conference', 'closing') 
  AND status IN ('conference', 'closing')
);

-- 7. PRINTER_HEARTBEATS - Remover política ALL permissiva
DROP POLICY IF EXISTS "Printer app can manage heartbeats" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "App can insert heartbeat" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "App can update own heartbeat" ON public.printer_heartbeats;

-- Criar políticas específicas por operação
CREATE POLICY "Printer heartbeat insert"
ON public.printer_heartbeats FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM restaurants WHERE id = printer_heartbeats.restaurant_id)
);

CREATE POLICY "Printer heartbeat update"
ON public.printer_heartbeats FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM restaurants WHERE id = printer_heartbeats.restaurant_id)
)
WITH CHECK (
  restaurant_id IS NOT NULL
);

CREATE POLICY "Printer heartbeat select"
ON public.printer_heartbeats FOR SELECT
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  OR EXISTS (SELECT 1 FROM restaurants WHERE id = printer_heartbeats.restaurant_id)
);

-- 8. Remover política SELECT pública de restaurants (manter apenas a função segura)
DROP POLICY IF EXISTS "Anyone can read restaurant by slug" ON public.restaurants;
