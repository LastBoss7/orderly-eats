-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can create their first restaurant" ON public.restaurants;

-- Create a simpler policy that just checks authentication
-- The trigger will handle the one-restaurant-per-user validation
CREATE POLICY "Users can create their first restaurant" 
ON public.restaurants 
FOR INSERT 
TO authenticated
WITH CHECK (true);