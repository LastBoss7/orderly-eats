-- Create coupons table for discount codes
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value NUMERIC NOT NULL DEFAULT 0,
  min_order_value NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- NULL = no expiration
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, code)
);

-- Add is_featured column to products for promotional highlights
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Enable RLS on coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- RLS policies for coupons (restaurant owners)
CREATE POLICY "Users can view their restaurant coupons"
ON public.coupons FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can create coupons for their restaurant"
ON public.coupons FOR INSERT
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update their restaurant coupons"
ON public.coupons FOR UPDATE
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can delete their restaurant coupons"
ON public.coupons FOR DELETE
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- PUBLIC READ policies for digital menu (anonymous access)
-- Allow anyone to read active restaurants by slug
CREATE POLICY "Public can view active restaurants by slug"
ON public.restaurants FOR SELECT
USING (is_active = true AND is_approved = true);

-- Allow anyone to read categories of active restaurants
CREATE POLICY "Public can view categories of active restaurants"
ON public.categories FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.restaurants r 
  WHERE r.id = categories.restaurant_id 
  AND r.is_active = true 
  AND r.is_approved = true
));

-- Allow anyone to read available products of active restaurants
CREATE POLICY "Public can view products of active restaurants"
ON public.products FOR SELECT
USING (
  is_available = true AND
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = products.restaurant_id 
    AND r.is_active = true 
    AND r.is_approved = true
  )
);

-- Allow anyone to validate and use coupons
CREATE POLICY "Public can view valid coupons"
ON public.coupons FOR SELECT
USING (
  is_active = true AND
  (valid_until IS NULL OR valid_until > now()) AND
  (max_uses IS NULL OR current_uses < max_uses) AND
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = coupons.restaurant_id 
    AND r.is_active = true
  )
);

-- Allow public to insert orders (for digital menu)
CREATE POLICY "Public can create orders from digital menu"
ON public.orders FOR INSERT
WITH CHECK (
  order_type = 'digital_menu' AND
  status = 'pending' AND
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = orders.restaurant_id 
    AND r.is_active = true
  )
);

-- Allow public to insert order items for digital menu orders
CREATE POLICY "Public can create order items for digital menu"
ON public.order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o 
    WHERE o.id = order_items.order_id 
    AND o.order_type = 'digital_menu'
  )
);

-- Allow public to insert customers
CREATE POLICY "Public can create customers from digital menu"
ON public.customers FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = customers.restaurant_id 
    AND r.is_active = true
  )
);

-- Update coupon usage (increment current_uses)
CREATE POLICY "Public can update coupon usage"
ON public.coupons FOR UPDATE
USING (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = coupons.restaurant_id 
    AND r.is_active = true
  )
)
WITH CHECK (
  is_active = true AND
  EXISTS (
    SELECT 1 FROM public.restaurants r 
    WHERE r.id = coupons.restaurant_id 
    AND r.is_active = true
  )
);

-- Function to validate and apply coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_restaurant_id UUID,
  p_code TEXT,
  p_order_total NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon RECORD;
  v_discount NUMERIC;
BEGIN
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE restaurant_id = p_restaurant_id
    AND UPPER(code) = UPPER(p_code)
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until > now())
    AND (max_uses IS NULL OR current_uses < max_uses);
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupom inválido ou expirado');
  END IF;
  
  IF p_order_total < COALESCE(v_coupon.min_order_value, 0) THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'error', 'Pedido mínimo de R$ ' || v_coupon.min_order_value || ' para usar este cupom'
    );
  END IF;
  
  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := p_order_total * (v_coupon.discount_value / 100);
  ELSE
    v_discount := v_coupon.discount_value;
  END IF;
  
  -- Cap discount to order total
  IF v_discount > p_order_total THEN
    v_discount := p_order_total;
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'discount', v_discount,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value
  );
END;
$$;

-- Function to use coupon (increment usage)
CREATE OR REPLACE FUNCTION public.use_coupon(p_coupon_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.coupons
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = p_coupon_id
    AND is_active = true
    AND (max_uses IS NULL OR current_uses < max_uses);
  
  RETURN FOUND;
END;
$$;

-- Add coupon_id and coupon_discount to orders for tracking
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_discount NUMERIC DEFAULT 0;