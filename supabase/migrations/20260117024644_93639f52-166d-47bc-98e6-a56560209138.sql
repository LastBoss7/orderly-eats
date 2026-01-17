-- Drop existing check constraints
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_type_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Recreate with 'closing' added to allowed values
ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check 
CHECK (order_type = ANY (ARRAY['counter'::text, 'table'::text, 'tab'::text, 'delivery'::text, 'takeaway'::text, 'conference'::text, 'closing'::text]));

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'preparing'::text, 'ready'::text, 'served'::text, 'out_for_delivery'::text, 'delivered'::text, 'cancelled'::text, 'conference'::text, 'closing'::text]));