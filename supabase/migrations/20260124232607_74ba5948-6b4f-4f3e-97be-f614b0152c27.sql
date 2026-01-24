-- Fix overly permissive INSERT policies on experience_surveys and suggestions

-- Drop the old permissive policy on experience_surveys
DROP POLICY IF EXISTS "Anyone can create experience surveys" ON public.experience_surveys;

-- Create a new policy that validates restaurant_id exists and is active
CREATE POLICY "Public can create experience surveys for active restaurants"
ON public.experience_surveys
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = experience_surveys.restaurant_id
      AND r.is_active = true
  )
);

-- Drop the old permissive policy on suggestions
DROP POLICY IF EXISTS "Anyone can create suggestions" ON public.suggestions;

-- Create a new policy that validates restaurant_id exists and is active
CREATE POLICY "Public can create suggestions for active restaurants"
ON public.suggestions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = suggestions.restaurant_id
      AND r.is_active = true
  )
);