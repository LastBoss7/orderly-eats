-- Allow authenticated users to insert restaurants (for signup)
CREATE POLICY "Authenticated users can create restaurants" 
ON public.restaurants 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow users to update their own restaurant
CREATE POLICY "Users can update their restaurant" 
ON public.restaurants 
FOR UPDATE 
USING (id = get_user_restaurant_id(auth.uid()))
WITH CHECK (id = get_user_restaurant_id(auth.uid()));