-- Add columns for special printer assignments in salon_settings
ALTER TABLE public.salon_settings 
ADD COLUMN IF NOT EXISTS conference_printer_id uuid REFERENCES public.printers(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS closing_printer_id uuid REFERENCES public.printers(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.salon_settings.conference_printer_id IS 'Printer ID used for conference/bill printing';
COMMENT ON COLUMN public.salon_settings.closing_printer_id IS 'Printer ID used for daily closing report printing';