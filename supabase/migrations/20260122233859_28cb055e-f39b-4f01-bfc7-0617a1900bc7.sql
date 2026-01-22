-- Add digital menu settings columns to salon_settings table
ALTER TABLE public.salon_settings 
ADD COLUMN IF NOT EXISTS digital_menu_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS digital_menu_banner_url text,
ADD COLUMN IF NOT EXISTS digital_menu_description text,
ADD COLUMN IF NOT EXISTS digital_menu_delivery_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS digital_menu_pickup_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS digital_menu_min_order_value numeric DEFAULT 0;