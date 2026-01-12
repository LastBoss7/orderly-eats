-- Create customers table for delivery data
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  cep TEXT,
  address TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage customers in their restaurant" 
ON public.customers 
FOR ALL 
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can view customers in their restaurant" 
ON public.customers 
FOR SELECT 
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Create index for phone lookup
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_restaurant ON public.customers(restaurant_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add customer_id to orders table for linking
ALTER TABLE public.orders ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Add delivery address fields to orders for historical data
ALTER TABLE public.orders ADD COLUMN delivery_address TEXT;
ALTER TABLE public.orders ADD COLUMN delivery_phone TEXT;