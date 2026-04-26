-- Sessions: a contiguous work session for a mission (auto-rolls when there's activity)
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mission_id UUID NOT NULL,
  conversation_id UUID,
  title TEXT NOT NULL DEFAULT 'Session',
  summary TEXT,
  lessons_learned TEXT,
  automations_suggested JSONB DEFAULT '[]'::jsonb,
  next_missions JSONB DEFAULT '[]'::jsonb,
  grade TEXT,
  grade_score INTEGER,
  grade_notes TEXT,
  manual_grade_override BOOLEAN NOT NULL DEFAULT false,
  findings_count INTEGER NOT NULL DEFAULT 0,
  tasks_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own sessions" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "create own sessions" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own sessions" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own sessions" ON public.sessions FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_sessions_user ON public.sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_mission ON public.sessions(mission_id);

-- agent_tasks: every action an agent took, with grading
CREATE TABLE public.agent_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mission_id UUID,
  session_id UUID,
  conversation_id UUID,
  message_id UUID,
  agent_codename TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT 'response',
  title TEXT NOT NULL,
  prompt TEXT,
  result TEXT,
  findings_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  grade TEXT,
  grade_score INTEGER,
  grade_reason TEXT,
  manual_grade_override BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own agent_tasks" ON public.agent_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "create own agent_tasks" ON public.agent_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own agent_tasks" ON public.agent_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own agent_tasks" ON public.agent_tasks FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_agent_tasks_updated BEFORE UPDATE ON public.agent_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_agent_tasks_user_agent ON public.agent_tasks(user_id, agent_codename, created_at DESC);
CREATE INDEX idx_agent_tasks_session ON public.agent_tasks(session_id);

-- automations: reusable Lead skills/playbooks
CREATE TABLE public.automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_codename TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  prompt_template TEXT NOT NULL,
  category TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'approved',
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own automations" ON public.automations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "create own automations" ON public.automations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own automations" ON public.automations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete own automations" ON public.automations FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_automations_updated BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_automations_user_agent ON public.automations(user_id, agent_codename);