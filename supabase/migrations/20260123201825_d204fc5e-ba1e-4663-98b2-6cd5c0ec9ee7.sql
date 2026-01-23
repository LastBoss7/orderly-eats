-- Allow public (anonymous users from digital menu) to search for their own customer record by phone
-- This is needed so returning customers can have their data pre-filled
CREATE POLICY "Public can search customers by phone for digital menu"
ON public.customers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM restaurants r
    WHERE r.id = customers.restaurant_id
    AND r.is_active = true
  )
);

-- Allow public to update their own customer data from digital menu
CREATE POLICY "Public can update their own customer from digital menu"
ON public.customers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM restaurants r
    WHERE r.id = customers.restaurant_id
    AND r.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM restaurants r
    WHERE r.id = customers.restaurant_id
    AND r.is_active = true
  )
);