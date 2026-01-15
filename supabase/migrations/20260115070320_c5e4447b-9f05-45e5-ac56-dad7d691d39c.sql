-- Add is_active column to restaurants table for access control
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Add suspended_at and suspended_reason columns for audit
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone DEFAULT NULL;

ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS suspended_reason text DEFAULT NULL;

-- Add RLS policy for admin to update all restaurants (for suspend/activate)
CREATE POLICY "Admins can update all restaurants"
ON public.restaurants
FOR UPDATE
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));