-- Create table for addon groups (e.g., "Extras", "Molhos", "Acompanhamentos")
CREATE TABLE public.addon_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_selections INTEGER DEFAULT 0,
  max_selections INTEGER DEFAULT 1,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for individual addons
CREATE TABLE public.addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table to link products to addon groups
CREATE TABLE public.product_addon_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  addon_group_id UUID NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, addon_group_id)
);

-- Enable RLS
ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_addon_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for addon_groups
CREATE POLICY "Users can view their restaurant addon groups"
ON public.addon_groups FOR SELECT
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can create addon groups for their restaurant"
ON public.addon_groups FOR INSERT
WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update their restaurant addon groups"
ON public.addon_groups FOR UPDATE
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can delete their restaurant addon groups"
ON public.addon_groups FOR DELETE
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

-- RLS Policies for addons
CREATE POLICY "Users can view their restaurant addons"
ON public.addons FOR SELECT
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can create addons for their restaurant"
ON public.addons FOR INSERT
WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update their restaurant addons"
ON public.addons FOR UPDATE
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can delete their restaurant addons"
ON public.addons FOR DELETE
USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

-- RLS Policies for product_addon_groups (check via product ownership)
CREATE POLICY "Users can view product addon links"
ON public.product_addon_groups FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id
    AND p.restaurant_id = public.get_user_restaurant_id(auth.uid())
  )
);

CREATE POLICY "Users can create product addon links"
ON public.product_addon_groups FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id
    AND p.restaurant_id = public.get_user_restaurant_id(auth.uid())
  )
);

CREATE POLICY "Users can delete product addon links"
ON public.product_addon_groups FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_id
    AND p.restaurant_id = public.get_user_restaurant_id(auth.uid())
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_addon_groups_updated_at
BEFORE UPDATE ON public.addon_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_addons_updated_at
BEFORE UPDATE ON public.addons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();