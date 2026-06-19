CREATE TYPE public.learning_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.recommendation_kind AS ENUM ('workflow', 'automation', 'skill');
CREATE TYPE public.recommendation_status AS ENUM ('pending', 'promoted', 'rejected');

CREATE TABLE public.agent_learnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mission_id UUID,
  session_id UUID,
  agent_codename TEXT NOT NULL,
  level public.learning_level NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_learnings TO authenticated;
GRANT ALL ON public.agent_learnings TO service_role;
ALTER TABLE public.agent_learnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_learnings" ON public.agent_learnings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_agent_learnings_updated BEFORE UPDATE ON public.agent_learnings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mission_id UUID,
  session_id UUID,
  agent_codename TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_memory TO authenticated;
GRANT ALL ON public.agent_memory TO service_role;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_memory" ON public.agent_memory FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_agent_memory_updated BEFORE UPDATE ON public.agent_memory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.agent_opinions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID,
  agent_codename TEXT NOT NULL,
  topic TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_opinions TO authenticated;
GRANT ALL ON public.agent_opinions TO service_role;
ALTER TABLE public.agent_opinions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_opinions" ON public.agent_opinions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_agent_opinions_updated BEFORE UPDATE ON public.agent_opinions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.agent_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID,
  agent_codename TEXT NOT NULL,
  kind public.recommendation_kind NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  status public.recommendation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_recommendations TO authenticated;
GRANT ALL ON public.agent_recommendations TO service_role;
ALTER TABLE public.agent_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_recs" ON public.agent_recommendations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_agent_recs_updated BEFORE UPDATE ON public.agent_recommendations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_learnings_agent ON public.agent_learnings(user_id, agent_codename, level);
CREATE INDEX idx_memory_agent ON public.agent_memory(user_id, agent_codename, session_id);
CREATE INDEX idx_opinions_agent ON public.agent_opinions(user_id, agent_codename);
CREATE INDEX idx_recs_agent ON public.agent_recommendations(user_id, agent_codename, status);