
CREATE TYPE public.agent_type AS ENUM ('manager', 'lead', 'raider');
CREATE TYPE public.agent_status AS ENUM ('active', 'idle', 'working', 'offline');
CREATE TYPE public.mission_status AS ENUM ('planning', 'active', 'paused', 'completed', 'archived');
CREATE TYPE public.finding_severity AS ENUM ('info', 'low', 'medium', 'high', 'critical');
CREATE TYPE public.message_role AS ENUM ('user', 'manager', 'lead', 'raider');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  target TEXT NOT NULL,
  scope TEXT,
  status public.mission_status NOT NULL DEFAULT 'planning',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own missions" ON public.missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own missions" ON public.missions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own missions" ON public.missions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own missions" ON public.missions FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  codename TEXT NOT NULL,
  type public.agent_type NOT NULL,
  role_description TEXT,
  system_prompt TEXT,
  parent_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  status public.agent_status NOT NULL DEFAULT 'idle',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own agents" ON public.agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own agents" ON public.agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agents" ON public.agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own agents" ON public.agents FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  role public.message_role NOT NULL DEFAULT 'user',
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);

CREATE TABLE public.tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  difficulty TEXT DEFAULT 'intermediate',
  use_case TEXT,
  website_url TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  bookmarked BOOLEAN NOT NULL DEFAULT false,
  custom_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view default tools" ON public.tools FOR SELECT USING (is_default = true);
CREATE POLICY "Users can view own custom tools" ON public.tools FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create custom tools" ON public.tools FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tools" ON public.tools FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tools" ON public.tools FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON public.tools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_tools_category ON public.tools(category);

CREATE TABLE public.findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity public.finding_severity NOT NULL DEFAULT 'info',
  affected_url TEXT,
  proof_of_concept TEXT,
  tools_used TEXT[],
  status TEXT NOT NULL DEFAULT 'draft',
  reward_amount NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own findings" ON public.findings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own findings" ON public.findings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own findings" ON public.findings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own findings" ON public.findings FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_findings_updated_at BEFORE UPDATE ON public.findings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_findings_mission ON public.findings(mission_id);
CREATE INDEX idx_findings_severity ON public.findings(severity);
