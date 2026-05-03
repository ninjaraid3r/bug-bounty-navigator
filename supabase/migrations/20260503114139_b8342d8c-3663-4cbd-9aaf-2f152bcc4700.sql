-- Sessions: structured Commander memory
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS key_topic text,
  ADD COLUMN IF NOT EXISTS high_learnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS medium_learnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS low_learnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS critical_changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS agent_insights jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS team_improvements jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Agent tasks: outcome counters per task
ALTER TABLE public.agent_tasks
  ADD COLUMN IF NOT EXISTS found_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fixed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS specialty_notes text;