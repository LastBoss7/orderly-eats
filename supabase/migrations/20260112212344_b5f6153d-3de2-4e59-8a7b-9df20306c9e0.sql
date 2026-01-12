-- Function to check if user already has a restaurant
CREATE OR REPLACE FUNCTION public.check_user_restaurant_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the authenticated user already has a profile with a restaurant
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND restaurant_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'User already has a restaurant. Only one restaurant per user is allowed.';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce the limit
CREATE TRIGGER enforce_one_restaurant_per_user
  BEFORE INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.check_user_restaurant_limit();

-- Update the RLS policy to be more descriptive
DROP POLICY IF EXISTS "Authenticated users can create restaurants" ON public.restaurants;

CREATE POLICY "Users can create their first restaurant" 
ON public.restaurants 
FOR INSERT 
TO authenticated
WITH CHECK (
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND restaurant_id IS NOT NULL
  )
);