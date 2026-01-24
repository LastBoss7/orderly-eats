-- ============================================
-- FIX: Remove public SELECT policy on restaurants table
-- Only restaurant owners should see full data (including CNPJ, phone, address)
-- Public access uses the restaurants_public view or get_restaurant_by_slug function
-- ============================================

-- Remove the public access policy we just created
DROP POLICY IF EXISTS "Public can view basic restaurant info only" ON public.restaurants;

-- Keep ONLY the authenticated owner policy
-- (Already exists from previous migration: "Users can view their own restaurant full data")