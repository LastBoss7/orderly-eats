-- Create printers table for storing printer configurations
CREATE TABLE public.printers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  name TEXT NOT NULL,
  model TEXT,
  printer_name TEXT,
  status TEXT DEFAULT 'disconnected',
  paper_width INTEGER DEFAULT 48,
  linked_order_types TEXT[] DEFAULT ARRAY['counter', 'table', 'delivery'],
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view printers in their restaurant"
ON public.printers
FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage printers in their restaurant"
ON public.printers
FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_printers_updated_at
BEFORE UPDATE ON public.printers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();