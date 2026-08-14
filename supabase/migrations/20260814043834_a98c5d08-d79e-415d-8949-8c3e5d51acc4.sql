CREATE TABLE public.patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mission_id uuid null,
  session_id uuid null,
  agent_codename text not null,
  category text not null,
  title text not null,
  description text not null,
  example text null,
  tags text[] not null default '{}',
  status text not null default 'pending',
  commander_note text null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patterns TO authenticated;
GRANT ALL ON public.patterns TO service_role;

ALTER TABLE public.patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patterns_select_own" ON public.patterns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "patterns_insert_own" ON public.patterns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "patterns_update_own" ON public.patterns FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "patterns_delete_own" ON public.patterns FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX patterns_user_status_idx ON public.patterns(user_id, status, created_at DESC);