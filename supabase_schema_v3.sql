-- Add gender column to students table
alter table public.students 
add column if not exists gender text check (gender in ('L', 'P'));

-- Optional: Update existing records to default (e.g., 'L' or NULL) if needed
-- update public.students set gender = 'L' where gender is null;
