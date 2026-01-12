-- Table for salon settings per restaurant
CREATE TABLE public.salon_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL UNIQUE,
  has_dining_room boolean DEFAULT false,
  table_count integer DEFAULT 0,
  order_tab_count integer DEFAULT 0,
  has_waiters boolean DEFAULT false,
  operation_type text DEFAULT NULL,
  service_table boolean DEFAULT false,
  service_individual boolean DEFAULT false,
  service_counter boolean DEFAULT false,
  service_self boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for waiters/staff per restaurant
CREATE TABLE public.waiters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  status text DEFAULT 'active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table for salon areas per restaurant
CREATE TABLE public.salon_areas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT 'bg-blue-500',
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.salon_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_areas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for salon_settings
CREATE POLICY "Users can view their restaurant salon settings"
ON public.salon_settings FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can insert their restaurant salon settings"
ON public.salon_settings FOR INSERT
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update their restaurant salon settings"
ON public.salon_settings FOR UPDATE
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- RLS Policies for waiters
CREATE POLICY "Users can view waiters in their restaurant"
ON public.waiters FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage waiters in their restaurant"
ON public.waiters FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- RLS Policies for salon_areas
CREATE POLICY "Users can view areas in their restaurant"
ON public.salon_areas FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can manage areas in their restaurant"
ON public.salon_areas FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_salon_settings_updated_at
  BEFORE UPDATE ON public.salon_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_waiters_updated_at
  BEFORE UPDATE ON public.waiters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salon_areas_updated_at
  BEFORE UPDATE ON public.salon_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();