-- Add service_charge column to orders table
ALTER TABLE public.orders 
ADD COLUMN service_charge numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.service_charge IS 'Taxa de serviço aplicada ao pedido (ex: 10%)';