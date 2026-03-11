-- Check and create storage policies for prediction-files bucket if they don't exist
DO $$
BEGIN
    -- Policy for authenticated users to upload files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Users can upload prediction files'
    ) THEN
        CREATE POLICY "Users can upload prediction files"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'prediction-files' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    -- Policy for users to read their own files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Users can read own prediction files'
    ) THEN
        CREATE POLICY "Users can read own prediction files"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'prediction-files' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    -- Policy for users to delete their own files
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Users can delete own prediction files'
    ) THEN
        CREATE POLICY "Users can delete own prediction files"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'prediction-files' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;
END $$;