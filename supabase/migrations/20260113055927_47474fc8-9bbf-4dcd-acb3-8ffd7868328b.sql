-- Add ready_at column to track when order became ready
ALTER TABLE public.orders
ADD COLUMN ready_at timestamp with time zone DEFAULT NULL;

-- Add comment
COMMENT ON COLUMN public.orders.ready_at IS 'Timestamp when order status changed to ready';