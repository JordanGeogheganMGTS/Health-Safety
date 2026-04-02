-- ============================================================
-- FILE 20: 00020_storage_policies.sql
-- Storage bucket RLS policies for health-safety-files
-- ============================================================

-- NOTE: The bucket 'health-safety-files' must be created manually
-- in the Supabase dashboard (Storage → New bucket) as Supabase
-- SQL migrations cannot create storage buckets directly.

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'health-safety-files');

-- Allow authenticated users to read/download files
CREATE POLICY "Authenticated users can read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'health-safety-files');

-- Allow authenticated users to overwrite/replace files
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'health-safety-files');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'health-safety-files');
