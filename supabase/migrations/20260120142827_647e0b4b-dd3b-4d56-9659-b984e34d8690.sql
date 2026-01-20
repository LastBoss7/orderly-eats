-- Drop and recreate printer_heartbeats policies with proper UPSERT support
DROP POLICY IF EXISTS "Anyone can insert printer heartbeats" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Anyone can read printer heartbeats" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Anyone can update printer heartbeats" ON public.printer_heartbeats;

-- SELECT policy
CREATE POLICY "Public read printer heartbeats"
ON public.printer_heartbeats
FOR SELECT
TO anon, authenticated
USING (true);

-- INSERT policy - allow anyone with valid restaurant_id
CREATE POLICY "Public insert printer heartbeats"
ON public.printer_heartbeats
FOR INSERT
TO anon, authenticated
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id)
);

-- UPDATE policy - needs USING clause for the existing row check
CREATE POLICY "Public update printer heartbeats"
ON public.printer_heartbeats
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id)
);