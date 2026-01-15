-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Allow heartbeat insert from app" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Allow heartbeat update from app" ON public.printer_heartbeats;
DROP POLICY IF EXISTS "Allow heartbeat read for restaurant users" ON public.printer_heartbeats;

-- Create permissive policies for heartbeat (this is monitoring data, not sensitive)
-- Allow anyone to insert/update heartbeats (Electron app uses anon key)
CREATE POLICY "Allow heartbeat upsert"
ON public.printer_heartbeats
FOR ALL
USING (true)
WITH CHECK (true);

-- Authenticated users can only read their restaurant's heartbeats
CREATE POLICY "Users read own restaurant heartbeats"
ON public.printer_heartbeats
FOR SELECT
TO authenticated
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));