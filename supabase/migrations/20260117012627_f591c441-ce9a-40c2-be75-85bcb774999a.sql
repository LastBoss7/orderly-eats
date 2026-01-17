-- Add policy to allow inserting conference/closing orders for printing (used by waiter app)
CREATE POLICY "Allow public insert for conference and closing orders"
ON public.orders
FOR INSERT
WITH CHECK (
  order_type IN ('conference', 'closing') 
  AND status IN ('conference', 'closing')
  AND print_status = 'pending'
);

-- Add policy to allow public delete for conference/closing orders (cleanup after print)
CREATE POLICY "Allow public delete for conference and closing orders"
ON public.orders
FOR DELETE
USING (
  order_type IN ('conference', 'closing') 
  AND status IN ('conference', 'closing')
);

-- Add policy to allow public insert for order_items of conference orders
CREATE POLICY "Allow public insert for conference order items"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.order_type IN ('conference', 'closing')
  )
);

-- Add policy to allow public delete for conference order items (cleanup)
CREATE POLICY "Allow public delete for conference order items"
ON public.order_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.order_type IN ('conference', 'closing')
  )
);