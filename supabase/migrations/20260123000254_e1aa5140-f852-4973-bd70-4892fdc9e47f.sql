-- Add visibility columns to categories table
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS visible_digital_menu boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS visible_waiter_app boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS visible_pos boolean DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN public.categories.visible_digital_menu IS 'Whether category appears in the public digital menu';
COMMENT ON COLUMN public.categories.visible_waiter_app IS 'Whether category appears in the waiter app';
COMMENT ON COLUMN public.categories.visible_pos IS 'Whether category appears in the internal POS/dashboard';