-- Clean up print_logs policies for Electron app (anonymous access)

-- Drop conflicting policies
DROP POLICY IF EXISTS "Users can insert print logs for their restaurant" ON public.print_logs;
DROP POLICY IF EXISTS "Users can view print logs in their restaurant" ON public.print_logs;
DROP POLICY IF EXISTS "Valid restaurant can insert print logs" ON public.print_logs;

-- SELECT: Anyone can read logs for valid restaurants
CREATE POLICY "Anyone can read print logs"
ON public.print_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = restaurant_id
  )
);

-- INSERT: Anyone can insert logs for valid restaurants
CREATE POLICY "Anyone can insert print logs"
ON public.print_logs
FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = restaurant_id
  )
);

-- UPDATE: Anyone can update logs for valid restaurants
CREATE POLICY "Anyone can update print logs"
ON public.print_logs
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