-- Drop and recreate the ALL policy to ensure UPDATE works correctly
DROP POLICY IF EXISTS "Users can manage orders in their restaurant" ON public.orders;

-- Create explicit policies for each operation
CREATE POLICY "Users can select orders in their restaurant" 
ON public.orders 
FOR SELECT 
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can insert orders in their restaurant" 
ON public.orders 
FOR INSERT 
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update orders in their restaurant" 
ON public.orders 
FOR UPDATE 
USING (restaurant_id = get_user_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can delete orders in their restaurant" 
ON public.orders 
FOR DELETE 
USING (restaurant_id = get_user_restaurant_id(auth.uid()));