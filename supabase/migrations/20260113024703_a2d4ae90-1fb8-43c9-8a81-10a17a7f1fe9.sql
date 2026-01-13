-- Add prep time columns to salon_settings
ALTER TABLE public.salon_settings
ADD COLUMN IF NOT EXISTS counter_prep_min integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS counter_prep_max integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS delivery_prep_min integer DEFAULT 25,
ADD COLUMN IF NOT EXISTS delivery_prep_max integer DEFAULT 80;