-- Create table to track partial payments on tabs
CREATE TABLE public.tab_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  tab_id UUID NOT NULL REFERENCES public.tabs(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  paid_by TEXT,
  notes TEXT,
  cash_received NUMERIC,
  change_given NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tab_payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage tab payments in their restaurant"
ON public.tab_payments
FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can view tab payments in their restaurant"
ON public.tab_payments
FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Add index for performance
CREATE INDEX idx_tab_payments_tab_id ON public.tab_payments(tab_id);
CREATE INDEX idx_tab_payments_restaurant_id ON public.tab_payments(restaurant_id);