-- Add category_id column to order_items for better category tracking
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id);

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_order_items_category_id ON public.order_items(category_id);

-- Update existing order_items with category_id from products where possible
UPDATE public.order_items oi
SET category_id = p.category_id
FROM public.products p
WHERE oi.product_id = p.id 
  AND oi.category_id IS NULL
  AND p.category_id IS NOT NULL;