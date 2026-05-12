-- Recon maps (one per target/session)
create table public.recon_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mission_id uuid not null,
  session_id uuid,
  conversation_id uuid,
  target text not null,
  summary text,
  tips jsonb not null default '[]'::jsonb,
  killchain jsonb not null default '[]'::jsonb,
  node_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recon_maps enable row level security;

create policy "view own recon_maps" on public.recon_maps
  for select using (auth.uid() = user_id);
create policy "create own recon_maps" on public.recon_maps
  for insert with check (auth.uid() = user_id);
create policy "update own recon_maps" on public.recon_maps
  for update using (auth.uid() = user_id);
-- intentionally NO delete policy: recon memory is permanent.

create index recon_maps_user_idx on public.recon_maps (user_id, updated_at desc);
create index recon_maps_mission_idx on public.recon_maps (mission_id);

create trigger recon_maps_set_updated_at
  before update on public.recon_maps
  for each row execute function public.update_updated_at_column();

-- Mind-map nodes
create table public.recon_map_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  map_id uuid not null references public.recon_maps(id) on delete restrict,
  node_key text not null,
  parent_key text,
  label text not null,
  node_type text not null default 'note',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (map_id, node_key)
);

alter table public.recon_map_nodes enable row level security;

create policy "view own recon_map_nodes" on public.recon_map_nodes
  for select using (auth.uid() = user_id);
create policy "create own recon_map_nodes" on public.recon_map_nodes
  for insert with check (auth.uid() = user_id);
create policy "update own recon_map_nodes" on public.recon_map_nodes
  for update using (auth.uid() = user_id);
-- intentionally NO delete policy: recon memory is permanent.

create index recon_map_nodes_map_idx on public.recon_map_nodes (map_id);

alter publication supabase_realtime add table public.recon_map_nodes;
alter publication supabase_realtime add table public.recon_maps;

-- Skill approval queue
alter table public.automations alter column status set default 'pending';
create index if not exists automations_user_status_idx on public.automations (user_id, status);
