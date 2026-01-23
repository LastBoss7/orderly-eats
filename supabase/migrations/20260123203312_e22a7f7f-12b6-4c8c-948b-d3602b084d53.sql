-- Fix INSERT policies to accept delivery/takeaway instead of digital_menu
DROP POLICY IF EXISTS "Public can create orders from digital menu" ON public.orders;

CREATE POLICY "Public can create orders from digital menu"
ON public.orders
FOR INSERT
WITH CHECK (
  order_type IN ('delivery', 'takeaway')
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = orders.restaurant_id
    AND r.is_active = true
  )
);

-- Fix order_items INSERT policy
DROP POLICY IF EXISTS "Public can create order items for digital menu" ON public.order_items;

CREATE POLICY "Public can create order items for digital menu"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.id = order_items.order_id
    AND o.order_type IN ('delivery', 'takeaway')
  )
);