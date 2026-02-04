-- ==================================================================
-- FINAL FIX: GROUP CHAT, COLLEGE PRIORITY & PRESENCE
-- Run this in Supabase SQL Editor to enable all features.
-- ==================================================================

-- 1. HARDEN DATA SCHEMA
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.conversation_members ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_by UUID[] DEFAULT '{}';

-- Fix existing rows for deleted_by to avoid NULL issues
UPDATE public.messages SET deleted_by = '{}' WHERE deleted_by IS NULL;

-- 2. SECURE GROUP MESSAGING (FIXES "CAN'T SEND IN GROUPS")
-- This policy ensures you can only send messages to chats you are actually in.
DROP POLICY IF EXISTS "msg_insert" ON public.messages;
CREATE POLICY "msg_insert" ON public.messages 
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversation_members 
    WHERE conversation_id = messages.conversation_id 
    AND user_id = auth.uid()
  )
);

-- 3. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- 4. VERIFICATION COMMANDS
-- Run these one by one if you want to be sure:
-- SELECT COUNT(*) FROM public.messages WHERE deleted_by IS NULL; -- Should be 0
-- SELECT * FROM public.conversation_members WHERE user_id = auth.uid(); -- Should show your joined groups
