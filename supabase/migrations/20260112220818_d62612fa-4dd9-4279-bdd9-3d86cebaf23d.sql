-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can create their first restaurant" ON public.restaurants;

-- Create a new PERMISSIVE policy for inserting restaurants
CREATE POLICY "Users can create their first restaurant" 
ON public.restaurants 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also need to allow inserts to profiles and user_roles during signup
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow users to insert their own roles during signup
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

CREATE POLICY "Users can insert their own role" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());