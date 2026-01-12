-- Add CNPJ column to restaurants table
ALTER TABLE public.restaurants ADD COLUMN cnpj text UNIQUE;

-- Create index for CNPJ lookups
CREATE INDEX idx_restaurants_cnpj ON public.restaurants(cnpj);