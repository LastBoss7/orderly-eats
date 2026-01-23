-- Improve the SELECT policy for digital menu orders to include just-created orders
-- This allows the insert().select().single() pattern to work
DROP POLICY IF EXISTS "Public can view digital menu orders after creation" ON public.orders;

CREATE POLICY "Public can view digital menu orders after creation"
ON public.orders
FOR SELECT
USING (
  order_type = 'digital_menu'
  AND created_at > (now() - interval '10 minutes')
);

-- Also update order_items policy
DROP POLICY IF EXISTS "Public can view digital menu order items" ON public.order_items;

CREATE POLICY "Public can view digital menu order items"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.id = order_items.order_id
    AND o.order_type = 'digital_menu'
    AND o.created_at > (now() - interval '10 minutes')
  )
);