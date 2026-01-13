-- Create table for daily closings history
CREATE TABLE public.daily_closings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  closing_date DATE NOT NULL,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  average_ticket NUMERIC NOT NULL DEFAULT 0,
  cancelled_orders INTEGER NOT NULL DEFAULT 0,
  payment_breakdown JSONB NOT NULL DEFAULT '{}',
  order_type_breakdown JSONB NOT NULL DEFAULT '{}',
  closed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, closing_date)
);

-- Enable RLS
ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view closings in their restaurant"
  ON public.daily_closings FOR SELECT
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can insert closings in their restaurant"
  ON public.daily_closings FOR INSERT
  WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update closings in their restaurant"
  ON public.daily_closings FOR UPDATE
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_daily_closings_updated_at
  BEFORE UPDATE ON public.daily_closings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();