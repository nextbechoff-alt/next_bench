-- ==================================================================
-- MASTER FIX FOR STUDY BUDDY CHAT & AUTO-EXPIRY
-- Run this in Supabase SQL Editor to fix all errors and enable auto-delete.
-- ==================================================================

-- 1. ADD MISSING COLUMNS
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.conversation_members ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.study_buddy 
ADD COLUMN IF NOT EXISTS level TEXT,
ADD COLUMN IF NOT EXISTS session_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;

-- 2. UPDATE PERMISSIONS (RLS)
-- Allow chat deletion by creator (needed for cleanup)
DROP POLICY IF EXISTS "conv_delete" ON public.conversations;
CREATE POLICY "conv_delete" ON public.conversations FOR DELETE USING (auth.uid() = created_by);

-- Allow both sender and receiver to delete skill swap requests
DROP POLICY IF EXISTS "req_delete" ON public.skill_swap_requests;
CREATE POLICY "req_delete" ON public.skill_swap_requests FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 3. SETUP AUTO-DELETION (CLEANUP)
-- This function deletes groups 1 hour after their session_time has passed
CREATE OR REPLACE FUNCTION public.cleanup_expired_study_groups()
RETURNS void AS $$
BEGIN
  -- Delete from study_buddy (cascades to members)
  -- The linked conversation is handled by our API deleteStudyBuddy, 
  -- but for direct DB deletion we might need a trigger if we want it perfect.
  DELETE FROM public.study_buddy 
  WHERE session_time < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable the pg_cron extension if possible (Supabase requires this for scheduling)
-- Note: On some Supabase plans, you might need to enable this in the Extensions UI.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup to run every hour
SELECT cron.schedule('cleanup-study-groups', '0 * * * *', 'SELECT public.cleanup_expired_study_groups()');

-- 4. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- 5. VERIFICATION QUERY (Run this to check if columns are now there)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'study_buddy' 
AND column_name IN ('level', 'session_time', 'conversation_id');
