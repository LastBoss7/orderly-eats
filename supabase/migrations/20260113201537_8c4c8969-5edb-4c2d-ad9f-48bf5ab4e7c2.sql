-- Add order_number column to orders table for daily sequential numbering
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_number integer;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

COMMENT ON COLUMN public.orders.order_number IS 'Daily sequential order number that resets when store opens';