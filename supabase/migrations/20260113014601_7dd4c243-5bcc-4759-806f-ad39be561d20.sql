-- Create storage bucket for printer executables
INSERT INTO storage.buckets (id, name, public)
VALUES ('printer-downloads', 'printer-downloads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the bucket
CREATE POLICY "Public read access for printer downloads"
ON storage.objects FOR SELECT
USING (bucket_id = 'printer-downloads');

-- Allow authenticated users to upload (admin only in practice)
CREATE POLICY "Authenticated users can upload printer files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'printer-downloads' AND auth.role() = 'authenticated');