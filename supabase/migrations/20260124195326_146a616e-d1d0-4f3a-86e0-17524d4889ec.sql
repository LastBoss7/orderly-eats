-- Remove duplicate SELECT policy
DROP POLICY IF EXISTS "Users can view orders in their restaurant" ON public.orders;