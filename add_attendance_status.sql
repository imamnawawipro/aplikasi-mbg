-- Menambahkan kolom status kehadiran di tabel mbg_logs
ALTER TABLE public.mbg_logs
ADD COLUMN IF NOT EXISTS status text DEFAULT 'H';

-- Opsional: Constraint agar hanya H, S, I, A
ALTER TABLE public.mbg_logs
DROP CONSTRAINT IF EXISTS mbg_logs_status_check;

ALTER TABLE public.mbg_logs
ADD CONSTRAINT mbg_logs_status_check CHECK (status IN ('H', 'S', 'I', 'A'));

-- Update data lama: Jika is_received = true maka status = 'H', jika false maka NULL (atau biarkan)
UPDATE public.mbg_logs
SET status = 'H'
WHERE is_received = true AND status IS NULL;
