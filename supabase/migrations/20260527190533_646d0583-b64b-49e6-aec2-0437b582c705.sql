-- Allow users to edit and delete their own messages (for the new chat management UI)
CREATE POLICY "Users can update own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);