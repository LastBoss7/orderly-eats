-- Drop existing problematic policies
DROP POLICY IF EXISTS "Electron app can insert heartbeats" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Electron app can update heartbeats" ON public.printer_heartbeats;

-- Create corrected INSERT policy (use NEW instead of table name for INSERT)
CREATE POLICY "Public insert heartbeats"
ON public.printer_heartbeats
FOR INSERT
TO public
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = restaurant_id 
    AND restaurants.is_active = true
  )
);

-- Create corrected UPDATE policy using composite key
CREATE POLICY "Public update heartbeats"
ON public.printer_heartbeats
FOR UPDATE
TO public
USING (
  restaurant_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = restaurant_id 
    AND restaurants.is_active = true
  )
)
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.restaurants 
    WHERE restaurants.id = restaurant_id 
    AND restaurants.is_active = true
  )
);