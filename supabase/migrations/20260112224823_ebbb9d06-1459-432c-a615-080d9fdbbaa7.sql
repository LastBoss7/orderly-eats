-- Create delivery_fees table for configurable delivery rates
CREATE TABLE public.delivery_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  neighborhood TEXT NOT NULL,
  city TEXT,
  fee NUMERIC NOT NULL DEFAULT 0,
  min_order_value NUMERIC DEFAULT 0,
  estimated_time TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.delivery_fees ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage delivery_fees in their restaurant" 
ON public.delivery_fees 
FOR ALL 
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can view delivery_fees in their restaurant" 
ON public.delivery_fees 
FOR SELECT 
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Create indexes
CREATE INDEX idx_delivery_fees_restaurant ON public.delivery_fees(restaurant_id);
CREATE INDEX idx_delivery_fees_neighborhood ON public.delivery_fees(neighborhood);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_delivery_fees_updated_at
BEFORE UPDATE ON public.delivery_fees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add delivery_fee column to orders
ALTER TABLE public.orders ADD COLUMN delivery_fee NUMERIC DEFAULT 0;