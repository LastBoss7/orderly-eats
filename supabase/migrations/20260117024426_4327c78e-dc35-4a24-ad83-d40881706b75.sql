-- Create storage bucket for printer app installer
INSERT INTO storage.buckets (id, name, public)
VALUES ('printer-app', 'printer-app', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read/download the installer files
CREATE POLICY "Anyone can download printer app"
ON storage.objects FOR SELECT
USING (bucket_id = 'printer-app');

-- Only authenticated users can upload (admins)
CREATE POLICY "Authenticated users can upload printer app"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'printer-app' AND auth.role() = 'authenticated');

-- Only authenticated users can delete old versions
CREATE POLICY "Authenticated users can delete printer app"
ON storage.objects FOR DELETE
USING (bucket_id = 'printer-app' AND auth.role() = 'authenticated');

-- Only authenticated users can update
CREATE POLICY "Authenticated users can update printer app"
ON storage.objects FOR UPDATE
USING (bucket_id = 'printer-app' AND auth.role() = 'authenticated');