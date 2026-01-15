-- Remove the permissive policies that allow anyone to insert/update
DROP POLICY IF EXISTS "Anyone can insert available printers" ON public.available_printers;
DROP POLICY IF EXISTS "Anyone can update available printers" ON public.available_printers;

-- The existing policies already handle proper filtering:
-- "Users can manage available printers in their restaurant" (ALL with restaurant_id check)
-- "Users can view available printers in their restaurant" (SELECT with restaurant_id check)

-- Verify that the remaining policies properly filter by restaurant_id
-- No additional policies needed since "Users can manage..." covers INSERT, UPDATE, DELETE