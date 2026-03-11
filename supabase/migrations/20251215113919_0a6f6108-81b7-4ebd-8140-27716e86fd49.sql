-- Create storage bucket for prediction files if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('prediction-files', 'prediction-files', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to prediction-files bucket
CREATE POLICY "Users can upload prediction files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'prediction-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own prediction files
CREATE POLICY "Users can read their own prediction files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'prediction-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own prediction files
CREATE POLICY "Users can delete their own prediction files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'prediction-files' AND auth.uid()::text = (storage.foldername(name))[1]);