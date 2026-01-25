-- Create students table
create table public.students (
  id uuid not null default gen_random_uuid (),
  name text not null,
  class text not null,
  created_at timestamp with time zone not null default now(),
  constraint students_pkey primary key (id)
);

-- Create mbg_logs table
create table public.mbg_logs (
  id uuid not null default gen_random_uuid (),
  student_id uuid not null,
  date date not null,
  is_received boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint mbg_logs_pkey primary key (id),
  constraint mbg_logs_student_id_fkey foreign key (student_id) references students (id) on delete cascade,
  constraint mbg_logs_student_date_unique unique (student_id, date)
);

-- Enable Row Level Security (RLS)
alter table public.students enable row level security;
alter table public.mbg_logs enable row level security;

-- Create policies (modify as needed for production)
-- For development/demo, we allow public read/write if needed, 
-- but better to keep it secure. Here is a basic policy allowing all operations for now
-- since authentication wasn't strictly specified in "Requirements" beyond "Teachers use this".
-- Ideally, teachers should be authenticated. For simplicity, we allow anon access for now 
-- OR assume the client will use the anon key.

create policy "Enable read access for all users" on public.students
  for select using (true);

create policy "Enable insert for all users" on public.students
  for insert with check (true);

create policy "Enable update for all users" on public.students
  for update using (true);
  
create policy "Enable read access for all users" on public.mbg_logs
  for select using (true);

create policy "Enable insert/update for all users" on public.mbg_logs
  for all using (true);
