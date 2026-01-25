-- FIX PERMISSION UNTUK TABLE daily_menus

-- 1. Reset RLS untuk tabel ini
ALTER TABLE public.daily_menus DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_menus ENABLE ROW LEVEL SECURITY;

-- 2. Hapus policy lama
DROP POLICY IF EXISTS "Enable read access for all users" ON public.daily_menus;
DROP POLICY IF EXISTS "Enable insert/update for all users" ON public.daily_menus;
DROP POLICY IF EXISTS "Allow All" ON public.daily_menus;

-- 3. Buat Policy Baru yang MENGIZINKAN SEMUA (Insert, Update, Select)
-- Ini penting karena kita barusan menambahkan Login.
-- User yang login (authenticated) harus bisa simpan data.

CREATE POLICY "Allow All Authenticated"
ON public.daily_menus
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow All Anon"
ON public.daily_menus
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- (Opsional) Storage juga perlu dipastikan aman
-- Re-run bucket public setup just in case
UPDATE storage.buckets SET public = true WHERE id = 'meal-photos';
