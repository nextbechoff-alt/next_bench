-- ==================================================================
-- MASTER SCHEMA FOR NEXTBENCH (UUID VERSION)
-- Everything consolidated: Profiles, Marketplace, Freelance, 
-- Events, Skill Swaps, Study Buddies, and Safe Chat RLS.
-- ==================================================================

-- 0. CLEANUP (Ensures a fresh, consistent start)
-- WARNING: This drops all data. Remove if you only want to update policies.
-- DROP TABLE IF EXISTS public.favorites CASCADE;
-- DROP TABLE IF EXISTS public.notifications CASCADE;
-- DROP TABLE IF EXISTS public.messages CASCADE;
-- DROP TABLE IF EXISTS public.conversation_members CASCADE;
-- DROP TABLE IF EXISTS public.conversations CASCADE;
-- DROP TABLE IF EXISTS public.study_group_members CASCADE;
-- DROP TABLE IF EXISTS public.study_buddy CASCADE;
-- DROP TABLE IF EXISTS public.skill_swap_requests CASCADE;
-- DROP TABLE IF EXISTS public.skill_swap CASCADE;
-- DROP TABLE IF EXISTS public.events CASCADE;
-- DROP TABLE IF EXISTS public.services CASCADE;
-- DROP TABLE IF EXISTS public.products CASCADE;
-- DROP TABLE IF EXISTS public.users CASCADE;

------------------------------------------------------------------
-- 1. EXTENSIONS
------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

------------------------------------------------------------------
-- 2. TABLES DEFINITIONS
------------------------------------------------------------------

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  bio TEXT,
  location TEXT,
  avatar_url TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  coins INTEGER DEFAULT 0,
  trust_score INTEGER DEFAULT 100,
  campus TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2),
  category TEXT,
  image_urls TEXT[] DEFAULT '{}',
  condition TEXT,
  campus TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. SERVICES (FREELANCE)
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER DEFAULT 0,
  category TEXT,
  unit TEXT, -- e.g., per hour
  skills TEXT[],
  rating DECIMAL(2, 1) DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  image_url TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. EVENTS
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  type TEXT,
  date TEXT,
  time TEXT,
  location TEXT,
  college TEXT,
  participants INTEGER DEFAULT 0,
  max_participants INTEGER,
  fee INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  image_url TEXT,
  official_link TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. SKILL SWAP
CREATE TABLE IF NOT EXISTS public.skill_swap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_offered TEXT NOT NULL,
  skill_wanted TEXT NOT NULL,
  description TEXT,
  category TEXT,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SKILL SWAP REQUESTS
CREATE TABLE IF NOT EXISTS public.skill_swap_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    swap_id UUID REFERENCES public.skill_swap(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- pending, accepted, declined
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. STUDY BUDDY
CREATE TABLE IF NOT EXISTS public.study_buddy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  topic TEXT,
  description TEXT,
  college TEXT,
  max_members INTEGER DEFAULT 5,
  schedule TEXT,
  location TEXT,
  level TEXT, -- Beginner, Intermediate, Advanced
  session_time TIMESTAMPTZ, -- For auto-deletion
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. STUDY GROUP MEMBERS
CREATE TABLE IF NOT EXISTS public.study_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.study_buddy(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- 9. CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT, -- only for group chats
  is_group BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID,
  campus TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ
);

-- 10. CONVERSATION MEMBERS
CREATE TABLE IF NOT EXISTS public.conversation_members (
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);

-- 11. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT DEFAULT 'text',
    deleted_by UUID[] DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. FAVORITES
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- 13. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. RATINGS
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_target CHECK (
        (product_id IS NOT NULL AND service_id IS NULL) OR
        (product_id IS NULL AND service_id IS NOT NULL)
    ),
    UNIQUE(user_id, product_id),
    UNIQUE(user_id, service_id)
);

------------------------------------------------------------------
-- 3. ENABLE RLS
------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_swap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_buddy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------------
-- 4. POLICIES (SAFE, NON-RECURSIVE)
------------------------------------------------------------------

-- USERS
DROP POLICY IF EXISTS "public_read_users" ON public.users;
CREATE POLICY "public_read_users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "users_self_manage" ON public.users;
CREATE POLICY "users_self_manage" ON public.users FOR ALL USING (auth.uid() = id);

-- FAVORITES
DROP POLICY IF EXISTS "fav_select" ON public.favorites;
CREATE POLICY "fav_select" ON public.favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "fav_insert" ON public.favorites;
CREATE POLICY "fav_insert" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "fav_delete" ON public.favorites;
CREATE POLICY "fav_delete" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- PRODUCTS
DROP POLICY IF EXISTS "prod_read" ON products;
CREATE POLICY "prod_read" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "prod_all" ON products;
CREATE POLICY "prod_all" ON products FOR ALL USING (auth.uid() = user_id);

-- SERVICES
DROP POLICY IF EXISTS "serv_read" ON services;
CREATE POLICY "serv_read" ON services FOR SELECT USING (true);

DROP POLICY IF EXISTS "serv_all" ON services;
CREATE POLICY "serv_all" ON services FOR ALL USING (auth.uid() = user_id);

-- EVENTS
DROP POLICY IF EXISTS "event_read" ON events;
CREATE POLICY "event_read" ON events FOR SELECT USING (true);

DROP POLICY IF EXISTS "event_all" ON events;
CREATE POLICY "event_all" ON events FOR ALL USING (auth.uid() = user_id);

-- SKILL SWAP
DROP POLICY IF EXISTS "swap_read" ON skill_swap;
CREATE POLICY "swap_read" ON skill_swap FOR SELECT USING (true);

DROP POLICY IF EXISTS "swap_all" ON skill_swap;
CREATE POLICY "swap_all" ON skill_swap FOR ALL USING (auth.uid() = user_id);

-- SKILL SWAP REQUESTS
DROP POLICY IF EXISTS "req_select" ON skill_swap_requests;
CREATE POLICY "req_select" ON skill_swap_requests FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "req_insert" ON skill_swap_requests;
CREATE POLICY "req_insert" ON skill_swap_requests FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "req_update" ON skill_swap_requests;
CREATE POLICY "req_update" ON skill_swap_requests FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

DROP POLICY IF EXISTS "req_delete" ON skill_swap_requests;
CREATE POLICY "req_delete" ON skill_swap_requests FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- STUDY BUDDY
DROP POLICY IF EXISTS "buddy_read" ON study_buddy;
CREATE POLICY "buddy_read" ON study_buddy FOR SELECT USING (true);

DROP POLICY IF EXISTS "buddy_all" ON study_buddy;
CREATE POLICY "buddy_all" ON study_buddy FOR ALL USING (auth.uid() = user_id);

-- STUDY GROUP MEMBERS
DROP POLICY IF EXISTS "buddy_mem_read" ON study_group_members;
CREATE POLICY "buddy_mem_read" ON study_group_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "buddy_mem_insert" ON study_group_members;
CREATE POLICY "buddy_mem_insert" ON study_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "buddy_mem_delete" ON study_group_members;
CREATE POLICY "buddy_mem_delete" ON study_group_members FOR DELETE USING (auth.uid() = user_id);

-- CONVERSATIONS
DROP POLICY IF EXISTS "conv_insert" ON conversations;
CREATE POLICY "conv_insert" ON conversations FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "conv_select" ON conversations;
CREATE POLICY "conv_select" ON conversations FOR SELECT USING (
  auth.uid() = created_by OR 
  id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "conv_update" ON conversations;
CREATE POLICY "conv_update" ON conversations FOR UPDATE USING (
  auth.uid() = created_by OR 
  id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "conv_delete" ON conversations;
CREATE POLICY "conv_delete" ON conversations FOR DELETE USING (auth.uid() = created_by);

-- CONVERSATION MEMBERS
DROP POLICY IF EXISTS "mem_insert" ON conversation_members;
CREATE POLICY "mem_insert" ON conversation_members FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "mem_select" ON conversation_members;
CREATE POLICY "mem_select" ON conversation_members FOR SELECT USING (auth.role() = 'authenticated');

-- STORAGE
INSERT INTO storage.buckets (id, name, public) 
VALUES ('marketplace', 'marketplace', true), ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

-- Marketplace Policies
DROP POLICY IF EXISTS "Public Read marketplace" ON storage.objects;
CREATE POLICY "Public Read marketplace" ON storage.objects FOR SELECT USING (bucket_id = 'marketplace');

DROP POLICY IF EXISTS "Auth Insert marketplace" ON storage.objects;
CREATE POLICY "Auth Insert marketplace" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'marketplace' AND auth.role() = 'authenticated');

-- Materials Policies (Members Only)
DROP POLICY IF EXISTS "Member Read materials" ON storage.objects;
CREATE POLICY "Member Read materials" ON storage.objects FOR SELECT USING (
  bucket_id = 'materials' AND (
    (storage.foldername(name))[1] = 'groups' AND 
    EXISTS (
      SELECT 1 FROM study_group_members 
      WHERE group_id = (storage.foldername(name))[2]::uuid 
      AND user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Member Insert materials" ON storage.objects;
CREATE POLICY "Member Insert materials" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'materials' AND (
    (storage.foldername(name))[1] = 'groups' AND 
    EXISTS (
      SELECT 1 FROM study_group_members 
      WHERE group_id = (storage.foldername(name))[2]::uuid 
      AND user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Owner Delete materials" ON storage.objects;
CREATE POLICY "Owner Delete materials" ON storage.objects FOR DELETE USING (
  bucket_id = 'materials' AND (
    (storage.foldername(name))[1] = 'groups' AND 
    EXISTS (
      SELECT 1 FROM study_buddy 
      WHERE id = (storage.foldername(name))[2]::uuid 
      AND user_id = auth.uid()
    )
  )
);

-- MESSAGES
DROP POLICY IF EXISTS "msg_insert" ON messages;
CREATE POLICY "msg_insert" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "msg_select" ON messages;
CREATE POLICY "msg_select" ON messages FOR SELECT USING (
  conversation_id IN (SELECT conversation_id FROM conversation_members WHERE user_id = auth.uid())
);

-- NOTIFICATIONS
DROP POLICY IF EXISTS "notify_select" ON notifications;
CREATE POLICY "notify_select" ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notify_insert" ON notifications;
CREATE POLICY "notify_insert" ON notifications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "notify_update" ON notifications;
CREATE POLICY "notify_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- RATINGS
DROP POLICY IF EXISTS "ratings_read" ON ratings;
CREATE POLICY "ratings_read" ON ratings FOR SELECT USING (true);

DROP POLICY IF EXISTS "ratings_insert" ON ratings;
CREATE POLICY "ratings_insert" ON ratings FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

DROP POLICY IF EXISTS "ratings_update" ON ratings;
CREATE POLICY "ratings_update" ON ratings FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ratings_delete" ON ratings;
CREATE POLICY "ratings_delete" ON ratings FOR DELETE USING (auth.uid() = user_id);

------------------------------------------------------------------
-- 5. TRIGGERS
------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

------------------------------------------------------------------
-- 6. INDEXES
------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_mem_user ON conversation_members(user_id);

-- REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
