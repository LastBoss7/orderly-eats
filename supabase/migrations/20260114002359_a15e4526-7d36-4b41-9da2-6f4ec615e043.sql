-- Add waiter_id column to orders table
ALTER TABLE public.orders 
ADD COLUMN waiter_id uuid REFERENCES public.waiters(id) ON DELETE SET NULL;

-- Create index for better performance on waiter lookups
CREATE INDEX idx_orders_waiter_id ON public.orders(waiter_id);