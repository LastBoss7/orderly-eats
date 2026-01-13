-- Add payment tracking columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cash_received numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS change_given numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS split_mode text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS split_people integer DEFAULT NULL;

-- Create index for faster queries on closed orders
CREATE INDEX IF NOT EXISTS idx_orders_closed_at ON public.orders(closed_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);