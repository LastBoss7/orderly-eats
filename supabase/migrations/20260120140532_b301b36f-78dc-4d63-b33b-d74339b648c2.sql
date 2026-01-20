-- Drop conflicting/redundant policies on printer_heartbeats
DROP POLICY IF EXISTS "Printer heartbeat insert" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Printer heartbeat select" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Printer heartbeat update" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Authenticated users read own restaurant" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Users can view heartbeats for their restaurant" ON public.printer_heartbeats;

-- Create clean policies for printer_heartbeats
-- The Electron app sends heartbeats without auth (anon), so we need public access
-- but validated by restaurant_id existing

-- SELECT: Anyone can read heartbeats for valid restaurants
CREATE POLICY "Anyone can read printer heartbeats"
ON public.printer_heartbeats
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = restaurant_id
  )
);

-- INSERT: Anyone can insert heartbeats for valid restaurants
CREATE POLICY "Anyone can insert printer heartbeats"
ON public.printer_heartbeats
FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = restaurant_id
  )
);

-- UPDATE: Anyone can update heartbeats for valid restaurants
CREATE POLICY "Anyone can update printer heartbeats"
ON public.printer_heartbeats
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = restaurant_id
  )
)
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = restaurant_id
  )
);