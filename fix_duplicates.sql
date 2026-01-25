-- 1. Hapus Data Duplikat (Menyisakan 1 data terbaru per Nama + Kelas)
DELETE FROM public.students
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
         ROW_NUMBER() OVER (partition BY name, class ORDER BY created_at DESC) as rnum
    FROM public.students
  ) t
  WHERE t.rnum > 1
);

-- 2. Tambahkan Constraint UNIQUE agar tidak bisa input ganda lagi
ALTER TABLE public.students
ADD CONSTRAINT students_name_class_unique UNIQUE (name, class);

-- 3. (Opsional) Jika perlu gender juga unik per kelas? Mungkin tidak perlu, tapi name+class sebaiknya unik.

-- Reload schema cache
NOTIFY pgrst, 'reload config';
