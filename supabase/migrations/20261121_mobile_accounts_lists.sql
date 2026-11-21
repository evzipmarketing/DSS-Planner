-- DeepSkyMate mobile: auth-backed profiles, gear, lists, and favorites.
-- Apply with the Supabase CLI or SQL editor. Uses anon key + RLS from the app.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.gear_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  site_name text,
  latitude double precision,
  longitude double precision,
  timezone text,
  bortle integer,
  created_at timestamptz not null default now()
);

create table if not exists public.gear_telescopes (
  id uuid primary key default gen_random_uuid(),
  gear_profile_id uuid not null references public.gear_profiles (id) on delete cascade,
  seed_id text,
  name text not null,
  aperture_mm double precision not null,
  focal_length_mm double precision not null
);

create table if not exists public.gear_cameras (
  id uuid primary key default gen_random_uuid(),
  gear_profile_id uuid not null references public.gear_profiles (id) on delete cascade,
  seed_id text,
  name text not null,
  sensor_width_mm double precision not null,
  sensor_height_mm double precision not null,
  pixel_size_um double precision not null,
  width_px integer not null,
  height_px integer not null,
  sensor text not null check (sensor in ('mono', 'colour')),
  read_noise_e double precision not null
);

create table if not exists public.gear_filters (
  id uuid primary key default gen_random_uuid(),
  gear_profile_id uuid not null references public.gear_profiles (id) on delete cascade,
  seed_id text,
  name text not null,
  kind text not null,
  bandpass_nm double precision not null,
  transmission double precision not null
);

create table if not exists public.target_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.target_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.target_lists (id) on delete cascade,
  object_id text not null,
  notes text not null default '',
  sort_order integer not null default 0,
  unique (list_id, object_id)
);

create table if not exists public.saved_targets (
  user_id uuid not null references auth.users (id) on delete cascade,
  object_id text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, object_id)
);

alter table public.profiles enable row level security;
alter table public.gear_profiles enable row level security;
alter table public.gear_telescopes enable row level security;
alter table public.gear_cameras enable row level security;
alter table public.gear_filters enable row level security;
alter table public.target_lists enable row level security;
alter table public.target_list_items enable row level security;
alter table public.saved_targets enable row level security;

create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "gear_profiles_own" on public.gear_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "gear_telescopes_own" on public.gear_telescopes
  for all using (
    exists (select 1 from public.gear_profiles g where g.id = gear_profile_id and g.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.gear_profiles g where g.id = gear_profile_id and g.user_id = auth.uid())
  );

create policy "gear_cameras_own" on public.gear_cameras
  for all using (
    exists (select 1 from public.gear_profiles g where g.id = gear_profile_id and g.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.gear_profiles g where g.id = gear_profile_id and g.user_id = auth.uid())
  );

create policy "gear_filters_own" on public.gear_filters
  for all using (
    exists (select 1 from public.gear_profiles g where g.id = gear_profile_id and g.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.gear_profiles g where g.id = gear_profile_id and g.user_id = auth.uid())
  );

create policy "target_lists_own" on public.target_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "target_list_items_own" on public.target_list_items
  for all using (
    exists (select 1 from public.target_lists l where l.id = list_id and l.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.target_lists l where l.id = list_id and l.user_id = auth.uid())
  );

create policy "saved_targets_own" on public.saved_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
