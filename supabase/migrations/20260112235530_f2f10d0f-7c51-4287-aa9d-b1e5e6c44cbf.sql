-- Create print_logs table to track all print events across restaurants
CREATE TABLE public.print_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'print', -- 'print', 'reprint', 'error'
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failed', 'pending'
  printer_name TEXT,
  error_message TEXT,
  order_number TEXT,
  items_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_print_logs_restaurant_id ON public.print_logs(restaurant_id);
CREATE INDEX idx_print_logs_created_at ON public.print_logs(created_at DESC);
CREATE INDEX idx_print_logs_event_type ON public.print_logs(event_type);

-- Enable RLS
ALTER TABLE public.print_logs ENABLE ROW LEVEL SECURITY;

-- Policy for users to view logs in their restaurant
CREATE POLICY "Users can view print logs in their restaurant"
ON public.print_logs
FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Policy for inserting logs (via service role from edge function)
CREATE POLICY "Service role can insert print logs"
ON public.print_logs
FOR INSERT
WITH CHECK (true);

-- Enable realtime for print_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_logs;