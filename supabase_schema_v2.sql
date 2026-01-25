-- Create daily_menus table
create table public.daily_menus (
  date date not null,
  menu_items text,
  photo_path text,
  created_at timestamp with time zone not null default now(),
  constraint daily_menus_pkey primary key (date)
);

-- Enable RLS
alter table public.daily_menus enable row level security;

-- Policies for daily_menus
create policy "Enable read access for all users" on public.daily_menus
  for select using (true);

create policy "Enable insert/update for all users" on public.daily_menus
  for all using (true);

-- STORAGE BUCKET SETUP (Run this manually if script fails, or via Dashboard)
-- insert into storage.buckets (id, name, public) values ('meal-photos', 'meal-photos', true);

-- Storage Policies
-- Allow public read
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'meal-photos' );

-- Allow public upload (for demo purposes)
create policy "Public Upload"
  on storage.objects for insert
  with check ( bucket_id = 'meal-photos' );

create policy "Public Update"
  on storage.objects for update
  with check ( bucket_id = 'meal-photos' );
