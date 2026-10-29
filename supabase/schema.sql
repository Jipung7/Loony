-- ============================================================================
-- Loony — Supabase Schema (100% Forever-Free Stack)
-- Mengikat sinkronisasi Laptop Windows & Smartphone (PWA / Mobile)
-- menggunakan `sync_key` (Personal Sync Key tanpa login email ribet).
-- ============================================================================

-- 1. Tabel Snapshot State Lintas Perangkat (Offline-First + Realtime Sync)
create table if not exists public.productivity_sync_state (
  sync_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text not null default 'unknown'
);

alter table public.productivity_sync_state enable row level security;

create policy "Allow public access by sync_key"
  on public.productivity_sync_state
  for all
  using (true)
  with check (true);

-- 2. Tabel Transit File Kecil (< 10 MB) dengan Auto-Clean 24 Jam & Fitur Pin
create table if not exists public.bridge_files (
  id text primary key,
  sync_key text not null,
  name text not null,
  size bigint not null,
  mime_type text not null,
  storage_path text,
  public_url text,
  pinned boolean not null default false,
  device_source text not null default 'Desktop PC',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create index if not exists idx_bridge_files_sync_key on public.bridge_files(sync_key);
alter table public.bridge_files enable row level security;

create policy "Allow public access to bridge_files"
  on public.bridge_files
  for all
  using (true)
  with check (true);

-- 3. Fungsi & Trigger Auto-Clean File > 24 Jam (Kecuali yang di-Pin)
create or replace function public.cleanup_expired_bridge_files()
returns trigger
language plpgsql
security definer
as $$
begin
  delete from public.bridge_files
  where pinned = false
    and expires_at < now();
  return new;
end;
$$;

drop trigger if exists trg_cleanup_expired_bridge_files on public.bridge_files;
create trigger trg_cleanup_expired_bridge_files
  after insert or update on public.bridge_files
  execute function public.cleanup_expired_bridge_files();

-- Aktifkan Realtime pada kedua tabel
alter publication supabase_realtime add table public.productivity_sync_state;
alter publication supabase_realtime add table public.bridge_files;
