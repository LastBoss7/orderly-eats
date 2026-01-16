-- Create a function to atomically get and increment the order number
CREATE OR REPLACE FUNCTION public.get_next_order_number(_restaurant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  next_number integer;
BEGIN
  -- Ensure salon_settings exists for this restaurant
  INSERT INTO public.salon_settings (restaurant_id, daily_order_counter)
  VALUES (_restaurant_id, 0)
  ON CONFLICT (restaurant_id) DO NOTHING;
  
  -- Atomically increment and return the new order number
  UPDATE public.salon_settings
  SET daily_order_counter = COALESCE(daily_order_counter, 0) + 1,
      updated_at = now()
  WHERE restaurant_id = _restaurant_id
  RETURNING daily_order_counter INTO next_number;
  
  RETURN next_number;
END;
$function$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.get_next_order_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_order_number(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_next_order_number(uuid) TO anon;