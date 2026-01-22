-- Add opening hours columns to salon_settings table
ALTER TABLE public.salon_settings 
ADD COLUMN IF NOT EXISTS opening_hours jsonb DEFAULT '[
  {"day": 0, "name": "Domingo", "enabled": false, "open": "09:00", "close": "22:00"},
  {"day": 1, "name": "Segunda", "enabled": true, "open": "09:00", "close": "22:00"},
  {"day": 2, "name": "Terça", "enabled": true, "open": "09:00", "close": "22:00"},
  {"day": 3, "name": "Quarta", "enabled": true, "open": "09:00", "close": "22:00"},
  {"day": 4, "name": "Quinta", "enabled": true, "open": "09:00", "close": "22:00"},
  {"day": 5, "name": "Sexta", "enabled": true, "open": "09:00", "close": "22:00"},
  {"day": 6, "name": "Sábado", "enabled": true, "open": "09:00", "close": "22:00"}
]'::jsonb,
ADD COLUMN IF NOT EXISTS use_opening_hours boolean DEFAULT false;