-- Create table for delivery drivers (motoboys)
CREATE TABLE public.delivery_drivers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  vehicle_type text DEFAULT 'moto',
  license_plate text,
  status text DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view drivers in their restaurant"
  ON public.delivery_drivers
  FOR SELECT
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage drivers in their restaurant"
  ON public.delivery_drivers
  FOR ALL
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_delivery_drivers_updated_at
  BEFORE UPDATE ON public.delivery_drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();