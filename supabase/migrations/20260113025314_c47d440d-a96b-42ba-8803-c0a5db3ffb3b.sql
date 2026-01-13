-- Add auto print settings per order type to salon_settings
ALTER TABLE public.salon_settings
ADD COLUMN IF NOT EXISTS auto_print_counter boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_print_table boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_print_delivery boolean DEFAULT true;