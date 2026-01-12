-- Add sort_order column to tables for layout persistence
ALTER TABLE public.tables 
ADD COLUMN sort_order integer DEFAULT 0;

-- Update existing tables with initial sort order based on their number
UPDATE public.tables 
SET sort_order = number;