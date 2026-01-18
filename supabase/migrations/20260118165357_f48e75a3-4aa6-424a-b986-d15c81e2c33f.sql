
-- =====================================================
-- CORREÇÃO FINAL - ÚLTIMAS POLÍTICAS PERMISSIVAS
-- =====================================================

-- 1. RESTAURANTS - Corrigir política de INSERT 
-- Já existe função create_restaurant_with_profile que valida, mas a política precisa ser restritiva
DROP POLICY IF EXISTS "Users can create their first restaurant" ON public.restaurants;

-- Usuário autenticado pode criar restaurante (validação extra na função RPC)
CREATE POLICY "Authenticated users can create restaurant"
ON public.restaurants FOR INSERT
WITH CHECK (
  -- Apenas usuários autenticados podem criar
  auth.uid() IS NOT NULL
  -- E que ainda não tenham um restaurante (verificado pela trigger)
);

-- 2. WAITERS - Remover política de SELECT pública para autenticação
DROP POLICY IF EXISTS "Allow anonymous waiter authentication by PIN" ON public.waiters;

-- A autenticação de garçom deve ser feita via edge function com service role
-- Não é necessário expor dados de garçom publicamente
