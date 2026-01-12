-- Create a security definer function to handle the complete signup process
-- This bypasses RLS to create restaurant, profile, and role atomically
CREATE OR REPLACE FUNCTION public.create_restaurant_with_profile(
  _user_id uuid,
  _restaurant_name text,
  _restaurant_slug text,
  _cnpj text,
  _full_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _restaurant_id uuid;
BEGIN
  -- Create restaurant
  INSERT INTO public.restaurants (name, slug, cnpj)
  VALUES (_restaurant_name, _restaurant_slug, _cnpj)
  RETURNING id INTO _restaurant_id;

  -- Create profile
  INSERT INTO public.profiles (user_id, restaurant_id, full_name)
  VALUES (_user_id, _restaurant_id, _full_name);

  -- Create admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'admin');

  RETURN _restaurant_id;
END;
$$;