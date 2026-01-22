-- Fix function search_path security warnings
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_restaurant_id UUID,
  p_code TEXT,
  p_order_total NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.use_coupon(p_coupon_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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