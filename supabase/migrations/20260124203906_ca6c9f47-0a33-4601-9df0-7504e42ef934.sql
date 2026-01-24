-- ============================================
-- FIX: Secure customer_addresses table
-- Remove unrestricted public SELECT access
-- Require customer_id ownership verification
-- ============================================

-- Drop the overly permissive public policies
DROP POLICY IF EXISTS "Public can view customer addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Public can create customer addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Public can update customer addresses" ON public.customer_addresses;
DROP POLICY IF EXISTS "Public can delete customer addresses" ON public.customer_addresses;

-- Keep only the authenticated restaurant owner policy
-- (Already exists: "Restaurant owners can manage customer addresses")

-- Create a secure function to get addresses for a specific customer
-- This function validates the customer exists in the restaurant
CREATE OR REPLACE FUNCTION public.get_customer_addresses(_restaurant_id uuid, _customer_id uuid)
RETURNS TABLE(
  id uuid,
  customer_id uuid,
  restaurant_id uuid,
  label text,
  address text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  cep text,
  is_default boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ca.id,
    ca.customer_id,
    ca.restaurant_id,
    ca.label,
    ca.address,
    ca.number,
    ca.complement,
    ca.neighborhood,
    ca.city,
    ca.state,
    ca.cep,
    ca.is_default,
    ca.created_at,
    ca.updated_at
  FROM customer_addresses ca
  WHERE ca.restaurant_id = _restaurant_id
    AND ca.customer_id = _customer_id
    AND EXISTS (
      SELECT 1 FROM customers c 
      WHERE c.id = _customer_id 
        AND c.restaurant_id = _restaurant_id
    )
  ORDER BY ca.is_default DESC, ca.created_at DESC;
$$;

-- Create secure function to manage addresses (insert/update/delete)
CREATE OR REPLACE FUNCTION public.upsert_customer_address(
  _restaurant_id uuid,
  _customer_id uuid,
  _address_id uuid DEFAULT NULL,
  _label text DEFAULT 'Casa',
  _address text DEFAULT NULL,
  _number text DEFAULT NULL,
  _complement text DEFAULT NULL,
  _neighborhood text DEFAULT NULL,
  _city text DEFAULT NULL,
  _state text DEFAULT NULL,
  _cep text DEFAULT NULL,
  _is_default boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result_id uuid;
BEGIN
  -- Verify customer belongs to restaurant
  IF NOT EXISTS (
    SELECT 1 FROM customers 
    WHERE id = _customer_id 
      AND restaurant_id = _restaurant_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in restaurant';
  END IF;

  -- If setting as default, clear other defaults first
  IF _is_default THEN
    UPDATE customer_addresses 
    SET is_default = false 
    WHERE customer_id = _customer_id AND is_default = true;
  END IF;

  IF _address_id IS NOT NULL THEN
    -- Update existing address
    UPDATE customer_addresses
    SET 
      label = COALESCE(_label, label),
      address = COALESCE(_address, address),
      number = COALESCE(_number, number),
      complement = _complement,
      neighborhood = COALESCE(_neighborhood, neighborhood),
      city = COALESCE(_city, city),
      state = _state,
      cep = _cep,
      is_default = _is_default,
      updated_at = now()
    WHERE id = _address_id 
      AND customer_id = _customer_id
      AND restaurant_id = _restaurant_id
    RETURNING id INTO _result_id;
  ELSE
    -- Insert new address
    INSERT INTO customer_addresses (
      customer_id, restaurant_id, label, address, number, 
      complement, neighborhood, city, state, cep, is_default
    ) VALUES (
      _customer_id, _restaurant_id, _label, _address, _number,
      _complement, _neighborhood, _city, _state, _cep, _is_default
    )
    RETURNING id INTO _result_id;
  END IF;

  RETURN _result_id;
END;
$$;

-- Create secure function to delete an address
CREATE OR REPLACE FUNCTION public.delete_customer_address(
  _restaurant_id uuid,
  _customer_id uuid,
  _address_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify customer belongs to restaurant
  IF NOT EXISTS (
    SELECT 1 FROM customers 
    WHERE id = _customer_id 
      AND restaurant_id = _restaurant_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in restaurant';
  END IF;

  DELETE FROM customer_addresses
  WHERE id = _address_id 
    AND customer_id = _customer_id
    AND restaurant_id = _restaurant_id;
  
  RETURN FOUND;
END;
$$;

-- Create secure function to set default address
CREATE OR REPLACE FUNCTION public.set_default_customer_address(
  _restaurant_id uuid,
  _customer_id uuid,
  _address_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify customer belongs to restaurant
  IF NOT EXISTS (
    SELECT 1 FROM customers 
    WHERE id = _customer_id 
      AND restaurant_id = _restaurant_id
  ) THEN
    RAISE EXCEPTION 'Customer not found in restaurant';
  END IF;

  -- Clear all defaults for this customer
  UPDATE customer_addresses 
  SET is_default = false 
  WHERE customer_id = _customer_id;

  -- Set the new default
  UPDATE customer_addresses
  SET is_default = true, updated_at = now()
  WHERE id = _address_id 
    AND customer_id = _customer_id
    AND restaurant_id = _restaurant_id;
  
  RETURN FOUND;
END;
$$;

-- Grant execute on functions to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_customer_addresses(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_customer_address(uuid, uuid, uuid, text, text, text, text, text, text, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_customer_address(uuid, uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_default_customer_address(uuid, uuid, uuid) TO anon, authenticated;