-- Create tabs/comandas table
CREATE TABLE public.tabs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint for number per restaurant
ALTER TABLE public.tabs ADD CONSTRAINT tabs_restaurant_number_unique UNIQUE (restaurant_id, number);

-- Enable RLS
ALTER TABLE public.tabs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view tabs in their restaurant"
ON public.tabs FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage tabs in their restaurant"
ON public.tabs FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Add tab_id column to orders table for linking orders to tabs
ALTER TABLE public.orders ADD COLUMN tab_id UUID REFERENCES public.tabs(id) ON DELETE SET NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_tabs_updated_at
BEFORE UPDATE ON public.tabs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();