-- Drop existing policies on profiles if they exist and recreate with proper restrictions
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in same restaurant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

-- Create proper RLS policy for profiles - users can only see their own profile
CREATE POLICY "Users can only view their own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

-- Users can only insert their own profile
CREATE POLICY "Users can only insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can only update their own profile
CREATE POLICY "Users can only update their own profile"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid());

-- Fix customers table - restrict access to admins/managers only with proper restaurant scoping
DROP POLICY IF EXISTS "Users can manage customers in their restaurant" ON public.customers;
DROP POLICY IF EXISTS "customers_select" ON public.customers;
DROP POLICY IF EXISTS "customers_insert" ON public.customers;
DROP POLICY IF EXISTS "customers_update" ON public.customers;
DROP POLICY IF EXISTS "customers_delete" ON public.customers;

-- Only admins and managers can view customers in their restaurant
CREATE POLICY "Admins and managers can view customers in their restaurant"
ON public.customers
FOR SELECT
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  )
);

-- Only admins and managers can insert customers
CREATE POLICY "Admins and managers can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  )
);

-- Only admins and managers can update customers
CREATE POLICY "Admins and managers can update customers"
ON public.customers
FOR UPDATE
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  )
);

-- Only admins can delete customers
CREATE POLICY "Admins can delete customers"
ON public.customers
FOR DELETE
USING (
  restaurant_id IN (
    SELECT restaurant_id FROM public.profiles WHERE user_id = auth.uid()
  )
  AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
);