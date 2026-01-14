-- Add PIN column to waiters table for authentication
ALTER TABLE public.waiters 
ADD COLUMN pin text;

-- Create index for faster PIN lookups
CREATE INDEX idx_waiters_pin ON public.waiters(pin);

-- Add unique constraint to ensure PINs are unique within a restaurant
ALTER TABLE public.waiters
ADD CONSTRAINT waiters_pin_restaurant_unique UNIQUE (restaurant_id, pin);