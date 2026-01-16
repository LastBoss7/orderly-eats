-- Drop the existing status constraint and add updated one with 'conference' status
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'preparing'::text, 'ready'::text, 'served'::text, 'out_for_delivery'::text, 'delivered'::text, 'cancelled'::text, 'conference'::text]));