-- ============================================
-- FIX: Remove SECURITY DEFINER from restaurants_public view
-- Use SECURITY INVOKER (default) instead for safety
-- ============================================

-- Recreate the view without SECURITY DEFINER (uses SECURITY INVOKER by default)
DROP VIEW IF EXISTS public.restaurants_public;

CREATE VIEW public.restaurants_public 
WITH (security_invoker = true)
AS
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

-- Add a comment explaining the security model
COMMENT ON VIEW public.restaurants_public IS 'Public-safe view of restaurants with SECURITY INVOKER. Excludes sensitive data like CNPJ, phone, and full address. Use this view for unauthenticated digital menu access.';