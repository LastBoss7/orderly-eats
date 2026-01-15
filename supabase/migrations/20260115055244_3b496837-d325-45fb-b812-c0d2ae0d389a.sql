-- Create table to store available printers detected by Electron app
CREATE TABLE public.available_printers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  printer_name TEXT NOT NULL,
  display_name TEXT,
  driver_name TEXT,
  port_name TEXT,
  is_default BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, printer_name)
);

-- Enable RLS
ALTER TABLE public.available_printers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view available printers in their restaurant"
ON public.available_printers
FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage available printers in their restaurant"
ON public.available_printers
FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Allow Electron app to insert/update printers (using anon key with restaurant_id)
CREATE POLICY "Anyone can insert available printers"
ON public.available_printers
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update available printers"
ON public.available_printers
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_available_printers_restaurant ON public.available_printers(restaurant_id);
CREATE INDEX idx_available_printers_last_seen ON public.available_printers(last_seen_at);