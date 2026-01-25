-- SCRIPT PERBAIKAN STORAGE (Jalankan ini)

-- 1. Hapus SEMUA policy yang mungkin bentrok (satu per satu)
DROP POLICY IF EXISTS "Public Read meal-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload meal-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Update meal-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Allow Public Delete" ON storage.objects;
DROP POLICY IF EXISTS "ALL ACCESS" ON storage.objects;

-- 2. Pastikan Bucket Public
UPDATE storage.buckets
SET public = true
WHERE id = 'meal-photos';

INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-photos', 'meal-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Buat Policy Baru (Nama Unik: Policy_V3)
CREATE POLICY "V3_Public_Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'meal-photos' );

CREATE POLICY "V3_Public_Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'meal-photos' );

CREATE POLICY "V3_Public_Update"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'meal-photos' );
