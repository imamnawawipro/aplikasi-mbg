-- FORCE SETUP STORAGE BUCKET 'meal-photos'

-- 1. Pastikan Bucket Ada & Public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'meal-photos', 
    'meal-photos', 
    true, 
    5242880, -- Limit 5MB
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- 2. Hapus Policy Lama (Bersih-bersih)
DROP POLICY IF EXISTS "Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
DROP POLICY IF EXISTS "Give me access" ON storage.objects;
DROP POLICY IF EXISTS "Public Read meal-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload meal-photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Update meal-photos" ON storage.objects;

-- 3. Policy Super Longgar (Untuk memastikan keberhasilan)

-- ALLOW SELECT (Siapapun bisa lihat)
CREATE POLICY "Allow Public Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'meal-photos' );

-- ALLOW INSERT (Upload) - Baik Guest maupun Logged In
CREATE POLICY "Allow Public Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'meal-photos' );

-- ALLOW UPDATE
CREATE POLICY "Allow Public Update"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'meal-photos' );

-- ALLOW DELETE (Jaga-jaga jika perlu ganti foto)
CREATE POLICY "Allow Public Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'meal-photos' );
