
-- =============================================
-- Fix 1: Restrict customers table - require phone match for public access
-- =============================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Public can search customers by phone for digital menu" ON public.customers;

-- Create a more restrictive function for customer lookup by phone
CREATE OR REPLACE FUNCTION public.get_customer_by_phone(_restaurant_id uuid, _phone text)
RETURNS TABLE(
  id uuid,
  name text,
  phone text,
  address text,
  number text,
  complement text,
  neighborhood text,
  city text,
  cep text,
  state text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.name,
    c.phone,
    c.address,
    c.number,
    c.complement,
    c.neighborhood,
    c.city,
    c.cep,
    c.state
  FROM customers c
  WHERE c.restaurant_id = _restaurant_id
    AND c.phone = _phone
    AND EXISTS (
      SELECT 1 FROM restaurants r 
      WHERE r.id = _restaurant_id 
        AND r.is_active = true
    )
  LIMIT 1;
$$;

-- =============================================
-- Fix 2: Fix printer_heartbeats RLS - use UPSERT approach
-- =============================================

-- Drop problematic public INSERT policy
DROP POLICY IF EXISTS "Public insert heartbeats" ON public.printer_heartbeats;

-- Create a SECURITY DEFINER function for heartbeat upsert
CREATE OR REPLACE FUNCTION public.upsert_printer_heartbeat(
  _restaurant_id uuid,
  _client_id text,
  _client_name text DEFAULT NULL,
  _client_version text DEFAULT NULL,
  _platform text DEFAULT NULL,
  _printers_count integer DEFAULT NULL,
  _pending_orders integer DEFAULT NULL,
  _is_printing boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result_id uuid;
BEGIN
  -- Verify restaurant exists and is active
  IF NOT EXISTS (
    SELECT 1 FROM restaurants 
    WHERE id = _restaurant_id 
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Restaurant not found or inactive';
  END IF;

  -- Upsert heartbeat
  INSERT INTO printer_heartbeats (
    restaurant_id,
    client_id,
    client_name,
    client_version,
    platform,
    printers_count,
    pending_orders,
    is_printing,
    last_heartbeat_at,
    updated_at
  ) VALUES (
    _restaurant_id,
    _client_id,
    _client_name,
    _client_version,
    _platform,
    _printers_count,
    _pending_orders,
    _is_printing,
    now(),
    now()
  )
  ON CONFLICT (restaurant_id, client_id) 
  DO UPDATE SET
    client_name = EXCLUDED.client_name,
    client_version = EXCLUDED.client_version,
    platform = EXCLUDED.platform,
    printers_count = EXCLUDED.printers_count,
    pending_orders = EXCLUDED.pending_orders,
    is_printing = EXCLUDED.is_printing,
    last_heartbeat_at = now(),
    updated_at = now()
  RETURNING id INTO _result_id;

  RETURN _result_id;
END;
$$;

-- Add unique constraint for upsert if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'printer_heartbeats_restaurant_client_unique'
  ) THEN
    ALTER TABLE public.printer_heartbeats 
    ADD CONSTRAINT printer_heartbeats_restaurant_client_unique 
    UNIQUE (restaurant_id, client_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Drop the problematic public UPDATE policy too
DROP POLICY IF EXISTS "Public update heartbeats" ON public.printer_heartbeats;
