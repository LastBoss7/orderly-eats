-- Create storage bucket for restaurant logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('restaurant-logos', 'restaurant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for viewing logos (public)
CREATE POLICY "Restaurant logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-logos');

-- Create policy for uploading logos (authenticated users for their restaurant)
CREATE POLICY "Users can upload logos for their restaurant"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'restaurant-logos' 
  AND auth.role() = 'authenticated'
);

-- Create policy for updating logos
CREATE POLICY "Users can update logos for their restaurant"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'restaurant-logos' 
  AND auth.role() = 'authenticated'
);

-- Create policy for deleting logos
CREATE POLICY "Users can delete logos for their restaurant"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'restaurant-logos' 
  AND auth.role() = 'authenticated'
);

-- Add print settings columns to salon_settings table
ALTER TABLE public.salon_settings 
ADD COLUMN IF NOT EXISTS receipt_header TEXT,
ADD COLUMN IF NOT EXISTS receipt_footer TEXT,
ADD COLUMN IF NOT EXISTS show_address_on_receipt BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_phone_on_receipt BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_cnpj_on_receipt BOOLEAN DEFAULT true;