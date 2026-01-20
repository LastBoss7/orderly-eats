-- COMPLETE DATA ISOLATION AUDIT
-- Ensure ALL tables with restaurant_id have proper RLS policies

-- 1. delivery_fees - verify policies
DROP POLICY IF EXISTS "Users can manage delivery_fees in their restaurant" ON public.delivery_fees;
DROP POLICY IF EXISTS "Users can view delivery_fees in their restaurant" ON public.delivery_fees;

CREATE POLICY "Users can view delivery_fees in their restaurant"
ON public.delivery_fees FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can insert delivery_fees in their restaurant"
ON public.delivery_fees FOR INSERT
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update delivery_fees in their restaurant"
ON public.delivery_fees FOR UPDATE
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can delete delivery_fees in their restaurant"
ON public.delivery_fees FOR DELETE
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- 2. delivery_drivers - verify policies  
DROP POLICY IF EXISTS "Users can manage drivers in their restaurant" ON public.delivery_drivers;
DROP POLICY IF EXISTS "Users can view drivers in their restaurant" ON public.delivery_drivers;

CREATE POLICY "Users can view drivers in their restaurant"
ON public.delivery_drivers FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can insert drivers in their restaurant"
ON public.delivery_drivers FOR INSERT
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update drivers in their restaurant"
ON public.delivery_drivers FOR UPDATE
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can delete drivers in their restaurant"
ON public.delivery_drivers FOR DELETE
USING (restaurant_id = get_user_restaurant_id(auth.uid()));