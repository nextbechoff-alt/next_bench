-- RUN THESE ONE BY ONE IN SUPABASE SQL EDITOR TO DIAGNOSE

-- 1. Check if columns actually exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'study_buddy' 
AND column_name IN ('conversation_id', 'session_time');

-- 2. If the above returns nothing, run this to force create them
ALTER TABLE public.study_buddy 
ADD COLUMN IF NOT EXISTS session_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;

-- 3. Check if the 'conversations' table exists (it's a dependency)
SELECT table_name FROM information_schema.tables WHERE table_name = 'conversations';

-- 4. Final kick to the cache
NOTIFY pgrst, 'reload schema';
