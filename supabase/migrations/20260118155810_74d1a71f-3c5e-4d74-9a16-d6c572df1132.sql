-- Add scheduled_at column to orders table for scheduled orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE NULL;

-- Add index for efficient querying of scheduled orders
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_at ON public.orders (scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.orders.scheduled_at IS 'Timestamp when the order is scheduled to be ready. NULL means the order is for immediate preparation.';