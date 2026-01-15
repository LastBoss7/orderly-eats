-- Drop the old constraint and create a new one with all needed status values
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'preparing'::text, 'ready'::text, 'served'::text, 'out_for_delivery'::text, 'delivered'::text, 'cancelled'::text]));