-- Create table for printer heartbeats
CREATE TABLE public.printer_heartbeats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_name TEXT,
  client_version TEXT,
  platform TEXT,
  last_heartbeat_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_printing BOOLEAN DEFAULT false,
  pending_orders INTEGER DEFAULT 0,
  printers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, client_id)
);

-- Enable RLS
ALTER TABLE public.printer_heartbeats ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert/update heartbeats (the Electron app uses anon key)
CREATE POLICY "Allow insert heartbeats" 
ON public.printer_heartbeats 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update heartbeats" 
ON public.printer_heartbeats 
FOR UPDATE 
USING (true);

-- Allow authenticated users to read heartbeats for their restaurant
CREATE POLICY "Users can view heartbeats for their restaurant" 
ON public.printer_heartbeats 
FOR SELECT 
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE TRIGGER update_printer_heartbeats_updated_at
BEFORE UPDATE ON public.printer_heartbeats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for heartbeats
ALTER PUBLICATION supabase_realtime ADD TABLE public.printer_heartbeats;