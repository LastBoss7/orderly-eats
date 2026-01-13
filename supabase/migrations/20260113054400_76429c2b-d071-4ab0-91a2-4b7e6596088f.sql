-- Add size variation fields to products table
ALTER TABLE public.products 
ADD COLUMN has_sizes boolean DEFAULT false,
ADD COLUMN price_small numeric DEFAULT NULL,
ADD COLUMN price_medium numeric DEFAULT NULL,
ADD COLUMN price_large numeric DEFAULT NULL;

-- Add size field to order_items to track which size was ordered
ALTER TABLE public.order_items
ADD COLUMN product_size text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.products.has_sizes IS 'Whether this product has size variations (small, medium, large)';
COMMENT ON COLUMN public.products.price_small IS 'Price for small size (Pequeno)';
COMMENT ON COLUMN public.products.price_medium IS 'Price for medium size (Médio)';
COMMENT ON COLUMN public.products.price_large IS 'Price for large size (Grande)';
COMMENT ON COLUMN public.order_items.product_size IS 'Size selected: small, medium, or large';