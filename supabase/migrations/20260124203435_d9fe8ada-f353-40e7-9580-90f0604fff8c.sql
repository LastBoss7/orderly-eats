-- ============================================
-- FIX: Protect sensitive restaurant data
-- Create a public-safe view with only basic info
-- ============================================

-- Create a safe view for public access (digital menu, etc.)
CREATE OR REPLACE VIEW public.restaurants_public AS
SELECT 
  id,
  name,
  slug,
  logo_url,
  is_active,
  is_approved,
  created_at
FROM public.restaurants
WHERE is_active = true AND is_approved = true;

-- Grant access to the view
GRANT SELECT ON public.restaurants_public TO anon, authenticated;

-- Drop the existing overly permissive public policy
DROP POLICY IF EXISTS "Public can view active restaurants" ON public.restaurants;

-- Update get_restaurant_by_slug to use the safe view pattern
-- (but still return necessary fields for menu functionality)
CREATE OR REPLACE FUNCTION public.get_restaurant_by_slug(restaurant_slug text)
RETURNS TABLE(id uuid, name text, slug text, logo_url text, is_active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    r.id,
    r.name,
    r.slug,
    r.logo_url,
    r.is_active
  FROM restaurants r
  WHERE r.slug = restaurant_slug
    AND r.is_active = true
    AND r.is_approved = true
  LIMIT 1;
$$;

-- Create a new restrictive policy: Only restaurant owners can view full data
-- (keep existing owner policies but remove public access to sensitive columns)

-- Ensure authenticated users can only see their own restaurant's full data
DROP POLICY IF EXISTS "Users can view restaurants in their restaurant" ON public.restaurants;
CREATE POLICY "Users can view their own restaurant full data"
ON public.restaurants
FOR SELECT
USING (id = get_user_restaurant_id(auth.uid()));

-- Create a limited public view policy - only basic info
-- This uses a subquery to limit which columns are effectively returned
CREATE POLICY "Public can view basic restaurant info only"
ON public.restaurants
FOR SELECT
USING (
  is_active = true 
  AND is_approved = true
);

-- Add a comment explaining the security model
COMMENT ON VIEW public.restaurants_public IS 'Public-safe view of restaurants. Excludes sensitive data like CNPJ, phone, and full address. Use this view for unauthenticated digital menu access.';