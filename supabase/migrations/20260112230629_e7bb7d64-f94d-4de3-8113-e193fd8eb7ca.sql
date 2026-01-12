-- Add print tracking columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS print_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS printed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS print_count integer DEFAULT 0;

-- Create index for faster queries on pending prints
CREATE INDEX IF NOT EXISTS idx_orders_print_status ON public.orders(print_status, restaurant_id);

-- Add comment for documentation
COMMENT ON COLUMN public.orders.print_status IS 'pending, printed, or failed';
COMMENT ON COLUMN public.orders.printed_at IS 'Timestamp when order was last printed';
COMMENT ON COLUMN public.orders.print_count IS 'Number of times this order has been printed';