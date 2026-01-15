-- Add linked_categories column to printers table for category-based printing
ALTER TABLE public.printers 
ADD COLUMN linked_categories uuid[] NULL DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.printers.linked_categories IS 'Array of category IDs that this printer should print. NULL means print all categories.';

-- Add print_layout settings to salon_settings for centralized layout configuration
ALTER TABLE public.salon_settings
ADD COLUMN print_layout jsonb NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.salon_settings.print_layout IS 'Print layout configuration for thermal printers';