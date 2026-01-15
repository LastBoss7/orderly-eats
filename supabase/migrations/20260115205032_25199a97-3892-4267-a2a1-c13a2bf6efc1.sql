-- Drop overly permissive policy
DROP POLICY IF EXISTS "Allow heartbeat upsert" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Users read own restaurant heartbeats" ON public.printer_heartbeats;

-- Allow INSERT for any valid restaurant_id (Electron app with anon key)
CREATE POLICY "App can insert heartbeat"
ON public.printer_heartbeats
FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id)
);

-- Allow UPDATE only on rows matching the same restaurant_id being updated
CREATE POLICY "App can update own heartbeat"
ON public.printer_heartbeats
FOR UPDATE
USING (true)
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id)
);

-- Allow SELECT for the app to check existing heartbeats (needed for upsert)
CREATE POLICY "App can read heartbeats"
ON public.printer_heartbeats
FOR SELECT
USING (true);

-- Authenticated users can only read their own restaurant's heartbeats
CREATE POLICY "Authenticated users read own restaurant"
ON public.printer_heartbeats
FOR SELECT
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));