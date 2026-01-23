-- Update SELECT policy to allow delivery/takeaway orders from digital menu
DROP POLICY IF EXISTS "Public can view digital menu orders after creation" ON public.orders;

CREATE POLICY "Public can view digital menu orders after creation"
ON public.orders
FOR SELECT
USING (
  order_type IN ('delivery', 'takeaway')
  AND created_at > (now() - interval '10 minutes')
);

-- Update order_items policy
DROP POLICY IF EXISTS "Public can view digital menu order items" ON public.order_items;

CREATE POLICY "Public can view digital menu order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.id = order_items.order_id
    AND o.order_type IN ('delivery', 'takeaway')
    AND o.created_at > (now() - interval '10 minutes')
  )
);