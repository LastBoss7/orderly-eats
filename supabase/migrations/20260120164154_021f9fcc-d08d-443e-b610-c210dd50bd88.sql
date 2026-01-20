-- Drop all existing customer policies to clean up
DROP POLICY IF EXISTS "Admins and managers can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Admins and managers can update customers" ON public.customers;
DROP POLICY IF EXISTS "Admins and managers can view customers in their restaurant" ON public.customers;
DROP POLICY IF EXISTS "Admins can delete customers" ON public.customers;
DROP POLICY IF EXISTS "Managers can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Managers can view customers" ON public.customers;
DROP POLICY IF EXISTS "Waiters can create customers" ON public.customers;

-- Create clean, simple policies that enforce restaurant isolation

-- SELECT: Users can only view customers in their own restaurant
CREATE POLICY "Users can view customers in their restaurant"
ON public.customers
FOR SELECT
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
);

-- INSERT: Users can only insert customers for their own restaurant
CREATE POLICY "Users can create customers in their restaurant"
ON public.customers
FOR INSERT
WITH CHECK (
  restaurant_id = get_user_restaurant_id(auth.uid())
);

-- UPDATE: Admins and managers can update customers in their restaurant
CREATE POLICY "Admins and managers can update customers in their restaurant"
ON public.customers
FOR UPDATE
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
);

-- DELETE: Only admins can delete customers in their restaurant
CREATE POLICY "Admins can delete customers in their restaurant"
ON public.customers
FOR DELETE
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'admin')
);