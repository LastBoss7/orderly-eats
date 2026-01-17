-- Create table to link addon groups to categories
CREATE TABLE public.category_addon_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  addon_group_id UUID NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, addon_group_id)
);

-- Enable RLS
ALTER TABLE public.category_addon_groups ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view category addon links"
ON public.category_addon_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM categories c
    WHERE c.id = category_addon_groups.category_id
    AND c.restaurant_id = get_user_restaurant_id(auth.uid())
  )
);

CREATE POLICY "Users can create category addon links"
ON public.category_addon_groups
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM categories c
    WHERE c.id = category_addon_groups.category_id
    AND c.restaurant_id = get_user_restaurant_id(auth.uid())
  )
);

CREATE POLICY "Users can delete category addon links"
ON public.category_addon_groups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM categories c
    WHERE c.id = category_addon_groups.category_id
    AND c.restaurant_id = get_user_restaurant_id(auth.uid())
  )
);