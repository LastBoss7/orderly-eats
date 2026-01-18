-- Allow waiters to view customers in their restaurant
CREATE POLICY "Waiters can view customers in their restaurant"
  ON public.customers
  FOR SELECT
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.waiters 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Allow waiters to create customers in their restaurant
CREATE POLICY "Waiters can create customers in their restaurant"
  ON public.customers
  FOR INSERT
  WITH CHECK (
    restaurant_id IN (
      SELECT restaurant_id FROM public.waiters 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Allow waiters to update customers in their restaurant
CREATE POLICY "Waiters can update customers in their restaurant"
  ON public.customers
  FOR UPDATE
  USING (
    restaurant_id IN (
      SELECT restaurant_id FROM public.waiters 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );