-- 1. Vault status columns
ALTER TABLE public.agent_learnings ADD COLUMN IF NOT EXISTS vault_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.agent_memory ADD COLUMN IF NOT EXISTS vault_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.agent_opinions ADD COLUMN IF NOT EXISTS vault_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.agent_recommendations ADD COLUMN IF NOT EXISTS vault_status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS vault_status text NOT NULL DEFAULT 'pending';

-- 2. Commander personas
CREATE TABLE public.commander_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  system_prompt text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commander_personas TO authenticated;
GRANT ALL ON public.commander_personas TO service_role;

ALTER TABLE public.commander_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own personas"
  ON public.commander_personas
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_commander_personas_updated_at
  BEFORE UPDATE ON public.commander_personas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();