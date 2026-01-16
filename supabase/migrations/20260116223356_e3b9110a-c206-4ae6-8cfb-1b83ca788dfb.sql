-- Drop the existing constraint and add updated one with 'conference' type
ALTER TABLE public.orders DROP CONSTRAINT orders_order_type_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check 
CHECK (order_type = ANY (ARRAY['counter'::text, 'table'::text, 'tab'::text, 'delivery'::text, 'takeaway'::text, 'conference'::text]));