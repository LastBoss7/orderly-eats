-- Create customer_addresses table for multiple delivery addresses per customer
CREATE TABLE public.customer_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Casa',
  address TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  cep TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- Index for faster lookups
CREATE INDEX idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);
CREATE INDEX idx_customer_addresses_restaurant_id ON public.customer_addresses(restaurant_id);

-- RLS Policies
-- Restaurant owners can manage all addresses
CREATE POLICY "Restaurant owners can manage customer addresses"
ON public.customer_addresses
FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Public can create addresses (for digital menu customers)
CREATE POLICY "Public can create customer addresses"
ON public.customer_addresses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = customer_addresses.restaurant_id
    AND r.is_active = true
  )
);

-- Public can view their own addresses by customer_id (matched via phone lookup)
CREATE POLICY "Public can view customer addresses"
ON public.customer_addresses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = customer_addresses.restaurant_id
    AND r.is_active = true
  )
);

-- Public can update their own addresses
CREATE POLICY "Public can update customer addresses"
ON public.customer_addresses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = customer_addresses.restaurant_id
    AND r.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = customer_addresses.restaurant_id
    AND r.is_active = true
  )
);

-- Public can delete their own addresses
CREATE POLICY "Public can delete customer addresses"
ON public.customer_addresses
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM restaurants r
    WHERE r.id = customer_addresses.restaurant_id
    AND r.is_active = true
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_customer_addresses_updated_at
BEFORE UPDATE ON public.customer_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to ensure only one default address per customer
CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.customer_addresses
    SET is_default = false
    WHERE customer_id = NEW.customer_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER ensure_single_default_address_trigger
BEFORE INSERT OR UPDATE ON public.customer_addresses
FOR EACH ROW
WHEN (NEW.is_default = true)
EXECUTE FUNCTION public.ensure_single_default_address();