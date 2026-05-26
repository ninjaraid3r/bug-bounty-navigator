-- Restrict default tools to authenticated users only
DROP POLICY IF EXISTS "Users can view default tools" ON public.tools;
CREATE POLICY "Users can view default tools"
ON public.tools
FOR SELECT
TO authenticated
USING (is_default = true);

-- Add Realtime channel authorization so users can only subscribe to their own topics.
-- Topic convention: "user:<auth.uid()>" for per-user channels.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive own broadcasts" ON realtime.messages;
CREATE POLICY "Authenticated users can receive own broadcasts"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = ('user:' || auth.uid()::text))
  OR (realtime.topic() LIKE (auth.uid()::text || ':%'))
);

DROP POLICY IF EXISTS "Authenticated users can send to own topic" ON realtime.messages;
CREATE POLICY "Authenticated users can send to own topic"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() = ('user:' || auth.uid()::text))
  OR (realtime.topic() LIKE (auth.uid()::text || ':%'))
);