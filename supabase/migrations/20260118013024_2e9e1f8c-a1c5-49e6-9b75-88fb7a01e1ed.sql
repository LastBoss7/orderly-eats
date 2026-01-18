-- Add sound notification settings to salon_settings
ALTER TABLE public.salon_settings
ADD COLUMN IF NOT EXISTS sound_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_delivery boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_table boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_counter boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS sound_takeaway boolean DEFAULT true;