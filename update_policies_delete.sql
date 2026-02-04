-- 1. MESSAGES TABLE UPDATE
-- Add deleted_by column to track who deleted the message (WhatsApp style)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_by UUID[] DEFAULT '{}';

-- Fix existing rows where the column might be NULL after creation
UPDATE public.messages SET deleted_by = '{}' WHERE deleted_by IS NULL;

-- 2. MESSAGES DELETION (Update Policy)
-- Since we use update to 'delete for me', the SELECT policy needs to filter
DROP POLICY IF EXISTS "msg_select" ON public.messages;
CREATE POLICY "msg_select" ON public.messages FOR SELECT USING (
  conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
  AND (deleted_by IS NULL OR NOT (auth.uid() = ANY(deleted_by)))
);

-- Allow users to UPDATE the deleted_by array (soft delete)
DROP POLICY IF EXISTS "msg_update_delete" ON public.messages;
CREATE POLICY "msg_update_delete" ON public.messages 
FOR UPDATE USING (
  conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
) WITH CHECK (true);

-- 3. CONVERSATION MEMBERS DELETION (Delete for me = Remove membership)
-- This allows the user to 'remove' a conversation from their list
DROP POLICY IF EXISTS "mem_delete" ON public.conversation_members;
CREATE POLICY "mem_delete" ON public.conversation_members 
FOR DELETE USING (user_id = auth.uid());

-- 4. CONVERSATION DELETION POLICY (Ensure users can actually delete their chats)
DROP POLICY IF EXISTS "conv_delete" ON public.conversations;
CREATE POLICY "conv_delete" ON public.conversations 
FOR DELETE USING (auth.uid() = created_by);

-- 5. CONVERSATION ACCESS (Important for the subqueries)
-- Ensure selecting conversations works if member
DROP POLICY IF EXISTS "conv_select" ON conversations;
CREATE POLICY "conv_select" ON conversations FOR SELECT USING (
  auth.uid() = created_by OR 
  id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
);
