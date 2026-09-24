CREATE TABLE IF NOT EXISTS public.pocs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  mission_id uuid null,
  session_id uuid null,
  conversation_id uuid null,
  source_message_id uuid null,
  agent_codename text not null,
  title text not null,
  summary text not null,
  target text null,
  severity text not null default 'medium',
  path text not null,
  payload text null,
  tools text[] not null default '{}',
  tags text[] not null default '{}',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pocs TO authenticated;
GRANT ALL ON public.pocs TO service_role;

ALTER TABLE public.pocs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pocs_select_own" ON public.pocs;
DROP POLICY IF EXISTS "pocs_insert_own" ON public.pocs;
DROP POLICY IF EXISTS "pocs_update_own" ON public.pocs;
DROP POLICY IF EXISTS "pocs_delete_own" ON public.pocs;
CREATE POLICY "pocs_select_own" ON public.pocs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pocs_insert_own" ON public.pocs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pocs_update_own" ON public.pocs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pocs_delete_own" ON public.pocs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS pocs_user_created_idx ON public.pocs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pocs_session_idx ON public.pocs(session_id);

CREATE OR REPLACE FUNCTION public.pocs_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pocs_updated ON public.pocs;
CREATE TRIGGER trg_pocs_updated
BEFORE UPDATE ON public.pocs
FOR EACH ROW EXECUTE FUNCTION public.pocs_touch_updated_at();