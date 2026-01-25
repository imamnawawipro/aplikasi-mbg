-- SCRIPT DARURAT: MEMBUAT TABEL YANG HILANG

-- 1. Buat Tabel 'daily_menus' jika belum ada
CREATE TABLE IF NOT EXISTS public.daily_menus (
  date date not null,
  menu_items text,
  photo_path text,
  created_at timestamp with time zone not null default now(),
  constraint daily_menus_pkey primary key (date)
);

-- 2. Aktifkan Keamanan Row Level Security (RLS)
ALTER TABLE public.daily_menus ENABLE ROW LEVEL SECURITY;

-- 3. Hapus Policy Lama (jika ada, biar bersih)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.daily_menus;
DROP POLICY IF EXISTS "Enable insert/update for all users" ON public.daily_menus;
DROP POLICY IF EXISTS "Allow All Authenticated" ON public.daily_menus;
DROP POLICY IF EXISTS "Allow All Anon" ON public.daily_menus;

-- 4. Buat Policy Baru (Akses Penuh untuk Logged In User & Guest)
CREATE POLICY "Allow All Authenticated"
ON public.daily_menus FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Allow All Anon"
ON public.daily_menus FOR ALL TO anon
USING (true) WITH CHECK (true);

-- 5. Pastikan Bucket Storage Aman
INSERT INTO storage.buckets (id, name, public) 
VALUES ('meal-photos', 'meal-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;
