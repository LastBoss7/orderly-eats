-- Add store opening control columns to salon_settings
ALTER TABLE public.salon_settings 
ADD COLUMN IF NOT EXISTS is_open boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_opened_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS daily_order_counter integer DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_salon_settings_is_open ON public.salon_settings(is_open);

COMMENT ON COLUMN public.salon_settings.is_open IS 'Whether the store is currently open for orders';
COMMENT ON COLUMN public.salon_settings.last_opened_at IS 'Timestamp of when the store was last opened';
COMMENT ON COLUMN public.salon_settings.daily_order_counter IS 'Counter for daily order numbers that resets when store opens';