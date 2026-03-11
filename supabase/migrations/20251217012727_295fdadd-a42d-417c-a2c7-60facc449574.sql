-- Make platform-files bucket public for video/image display
UPDATE storage.buckets 
SET public = true 
WHERE id = 'platform-files';

-- Create storage policy to allow public read access
CREATE POLICY "Public read access for platform files"
ON storage.objects FOR SELECT
USING (bucket_id = 'platform-files');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload platform files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'platform-files' 
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own files (admins can delete any)
CREATE POLICY "Users can delete platform files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'platform-files' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  )
);