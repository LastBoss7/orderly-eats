-- Drop the existing order_type check constraint and add updated one
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_type_check;

-- Add new constraint with all valid order types
ALTER TABLE public.orders ADD CONSTRAINT orders_order_type_check 
CHECK (order_type IN ('counter', 'table', 'tab', 'delivery', 'takeaway'));