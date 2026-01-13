-- Add driver_id column to orders table
ALTER TABLE public.orders 
ADD COLUMN driver_id uuid REFERENCES public.delivery_drivers(id) ON DELETE SET NULL;