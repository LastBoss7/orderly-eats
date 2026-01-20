-- Add 'test' as a valid order status for test prints
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status = ANY (ARRAY[
    'pending'::text, 
    'preparing'::text, 
    'ready'::text, 
    'served'::text, 
    'out_for_delivery'::text, 
    'delivered'::text, 
    'cancelled'::text, 
    'conference'::text, 
    'closing'::text,
    'test'::text
  ])
);