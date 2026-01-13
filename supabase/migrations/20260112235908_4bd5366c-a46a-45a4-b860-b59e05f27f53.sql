-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Service role can insert print logs" ON public.print_logs;

-- Create a more restrictive policy that allows authenticated users to insert logs for their restaurant
CREATE POLICY "Users can insert print logs for their restaurant"
ON public.print_logs
FOR INSERT
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));