-- 1. Buat Bucket 'meal-photos' (jika belum ada) dan set Public
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-photos', 'meal-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Hapus policy lama agar tidak bentrok
DROP POLICY IF EXISTS "Public Read meal-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload meal-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Update meal-photos" ON storage.objects;

-- 3. Buat Policy Baru (Akses Penuh untuk Demo)

-- Izin Baca (Siapapun bisa lihat foto)
CREATE POLICY "Public Read meal-photos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'meal-photos' );

-- Izin Upload (Siapapun bisa upload - untuk kemudahan development)
CREATE POLICY "Public Upload meal-photos"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'meal-photos' );

-- Izin Update
CREATE POLICY "Public Update meal-photos"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'meal-photos' );
