-- Create suggestions table for user feedback
CREATE TABLE public.suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  type TEXT NOT NULL DEFAULT 'suggestion' CHECK (type IN ('suggestion', 'complaint', 'praise', 'question')),
  category TEXT CHECK (category IN ('food', 'service', 'delivery', 'app', 'price', 'other')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'read', 'in_progress', 'resolved', 'archived')),
  admin_notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create experience surveys table
CREATE TABLE public.experience_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  -- Ratings (1-5)
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  food_quality INTEGER CHECK (food_quality >= 1 AND food_quality <= 5),
  delivery_speed INTEGER CHECK (delivery_speed >= 1 AND delivery_speed <= 5),
  service_quality INTEGER CHECK (service_quality >= 1 AND service_quality <= 5),
  app_experience INTEGER CHECK (app_experience >= 1 AND app_experience <= 5),
  value_for_money INTEGER CHECK (value_for_money >= 1 AND value_for_money <= 5),
  -- Open feedback
  what_liked TEXT,
  what_to_improve TEXT,
  would_recommend BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_surveys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suggestions
-- Anyone can create suggestions (public access for digital menu)
CREATE POLICY "Anyone can create suggestions" 
  ON public.suggestions 
  FOR INSERT 
  WITH CHECK (true);

-- Restaurant owners can view their suggestions
CREATE POLICY "Restaurant owners can view their suggestions" 
  ON public.suggestions 
  FOR SELECT 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Restaurant owners can update their suggestions
CREATE POLICY "Restaurant owners can update their suggestions" 
  ON public.suggestions 
  FOR UPDATE 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Restaurant owners can delete their suggestions
CREATE POLICY "Restaurant owners can delete their suggestions" 
  ON public.suggestions 
  FOR DELETE 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for experience_surveys
-- Anyone can create surveys (public access for digital menu)
CREATE POLICY "Anyone can create experience surveys" 
  ON public.experience_surveys 
  FOR INSERT 
  WITH CHECK (true);

-- Restaurant owners can view their surveys
CREATE POLICY "Restaurant owners can view their surveys" 
  ON public.experience_surveys 
  FOR SELECT 
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_suggestions_restaurant ON public.suggestions(restaurant_id);
CREATE INDEX idx_suggestions_status ON public.suggestions(status);
CREATE INDEX idx_suggestions_created ON public.suggestions(created_at DESC);
CREATE INDEX idx_experience_surveys_restaurant ON public.experience_surveys(restaurant_id);
CREATE INDEX idx_experience_surveys_created ON public.experience_surveys(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_suggestions_updated_at
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();