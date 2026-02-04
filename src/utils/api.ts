import { supabase } from "./supabase";

let _campusCache: string | null = null;

export const api = {
    // Auth
    register: async (data: any) => {
        const { data: authData, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    name: data.name,
                }
            }
        });
        if (error) throw error;

        // If signup is successful and we have a user, create a profile entry
        if (authData.user) {
            await supabase.from('users').insert([{
                id: authData.user.id,
                name: data.name,
                email: data.email,
                campus: data.campus,
            }]);
        }

        return authData;
    },
    login: async (data: any) => {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
        });
        if (error) throw error;
        localStorage.setItem("token", authData.session.access_token);
        _campusCache = null;
        return authData;
    },
    loginWithGoogle: async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) throw error;
        return data;
    },
    logout: async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        _campusCache = null;
        window.location.href = "/";
    },

    // Internal helper to enforce our local auth check
    _getUser: async () => {
        if (!localStorage.getItem("token")) return null;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            localStorage.removeItem("token");
            return null;
        }
        return user;
    },

    _getUserCampus: async () => {
        if (_campusCache) return _campusCache;
        const user = await api._getUser();
        if (!user) return null;
        const { data } = await supabase.from('users').select('campus').eq('id', user.id).single();
        _campusCache = data?.campus || null;
        return _campusCache;
    },

    // User
    getMe: async () => {
        const user = await api._getUser();
        if (!user) throw new Error("Not logged in");

        await api.ensureUserProfile(user);

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle(); // Use maybeSingle to avoid throwing on empty result

        if (error) throw error;

        // If no profile exists yet, return basic details from auth
        if (!data) {
            return {
                id: user.id,
                name: user.user_metadata?.name || user.email?.split('@')[0],
                email: user.email,
                is_placeholder: true
            };
        }

        return data;
    },
    updateProfile: async (data: any) => {
        console.log("api.updateProfile called with:", data);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        const { data: profile, error } = await supabase
            .from('users')
            .upsert({
                ...data,
                id: user.id,
                email: user.email
            })
            .select()
            .single();

        if (error) {
            console.error("Supabase updateProfile error:", error);
            throw error;
        }
        console.log("Profile updated successfully:", profile);
        _campusCache = null;
        return profile;
    },
    getUser: async (id: string) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },
    getLeaderboard: async () => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('xp', { ascending: false })
            .limit(10);
        if (error) throw error;
        return data;
    },

    getProducts: async (filters?: { search?: string; campus?: string; category?: string }) => {
        let query = supabase
            .from('products')
            .select('*, ratings(rating)')
            .order('created_at', { ascending: false });
        if (filters?.search && filters.search.trim()) {
            const s = `%${filters.search.trim()}%`;
            query = query.or(`name.ilike.${s},description.ilike.${s},category.ilike.${s}`);
        }

        if (filters?.campus) {
            query = query.eq('campus', filters.campus);
        }

        if (filters?.category && filters.category !== 'all') {
            query = query.eq('category', filters.category);
        }


        const { data, error } = await query;
        if (error) {
            console.error("getProducts error:", error);
            throw error;
        }

        const campus = await api._getUserCampus();
        if (campus && !filters?.campus) {
            // Prioritize same campus
            return (data || []).sort((a: any, b: any) => {
                if (a.campus === campus && b.campus !== campus) return -1;
                if (a.campus !== campus && b.campus === campus) return 1;
                return 0;
            });
        }
        return data || [];
    },
    getProduct: async (id: string) => {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },
    // Helper to ensure user exists in public.users
    ensureUserProfile: async (user: any) => {
        // Use upsert to handle both creation and sync in one go.
        // This is more resilient to RLS and duplicate key errors.
        const { error } = await supabase
            .from('users')
            .upsert({
                id: user.id,
                name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
                email: user.email,
                campus: user.user_metadata?.campus
            }, { onConflict: 'id' });

        if (error) throw error;
    },

    createProduct: async (productData: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not logged in");

        await api.ensureUserProfile(user);

        const { name, description, price, category, image_urls, condition, campus } = productData;
        const { data, error } = await supabase
            .from('products')
            .insert([{
                name,
                description,
                price,
                category,
                image_urls,
                condition,
                campus,
                user_id: user.id
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },
    getMyProducts: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;
        return data;
    },

    // Services
    getServices: async () => {
        const { data, error } = await supabase
            .from('services')
            .select('*, users(name, avatar_url, email, campus), ratings(rating)')
            .order('created_at', { ascending: false });
        if (error) throw error;

        const campus = await api._getUserCampus();
        if (campus) {
            return (data || []).sort((a: any, b: any) => {
                const aCampus = a.users?.campus;
                const bCampus = b.users?.campus;
                if (aCampus === campus && bCampus !== campus) return -1;
                if (aCampus !== campus && bCampus === campus) return 1;
                return 0;
            });
        }
        return data;
    },
    getService: async (id: string) => {
        const { data, error } = await supabase
            .from('services')
            .select('*, users(name, avatar_url, email)')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },
    getMyServices: async () => {
        const user = await api._getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;
        return data;
    },

    // Events
    getEvents: async () => {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('date', { ascending: true });
        if (error) throw error;

        const campus = await api._getUserCampus();
        if (campus) {
            return (data || []).sort((a: any, b: any) => {
                if (a.college === campus && b.college !== campus) return -1;
                if (a.college !== campus && b.college === campus) return 1;
                return 0;
            });
        }
        return data;
    },
    getMyEvents: async () => {
        const user = await api._getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;
        return data;
    },

    // Skill Swap
    getSkillSwaps: async () => {
        const { data, error } = await supabase
            .from('skill_swap')
            .select('*, users(id, name, avatar_url, location, email, campus)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },
    createSkillSwap: async (data: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        await api.ensureUserProfile(user);

        const { data: swap, error } = await supabase
            .from('skill_swap')
            .insert([{
                ...data,
                user_id: user.id
            }])
            .select()
            .single();

        if (error) throw error;
        return swap;
    },
    proposeSkillSwap: async (swapId: string, receiverId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        await api.ensureUserProfile(user);

        const { data, error } = await supabase
            .from('skill_swap_requests')
            .insert([{
                swap_id: swapId,
                sender_id: user.id,
                receiver_id: receiverId
            }])
            .select('*, receiver:users!skill_swap_requests_receiver_id_fkey(name, email)')
            .single();

        if (error) throw error;
        return data;
    },
    getMySwapRequests: async () => {
        const user = await api._getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('skill_swap_requests')
            .select('*, sender:users!skill_swap_requests_sender_id_fkey(id, name, avatar_url, email), swap:skill_swap(*)')
            .eq('receiver_id', user.id);

        if (error) throw error;
        return data;
    },
    updateSkillSwapStatus: async (requestId: string, swapId: string, status: 'accepted' | 'declined') => {
        const { error } = await supabase
            .from('skill_swap_requests')
            .update({ status })
            .eq('id', requestId);
        if (error) throw error;
        return true;
    },

    deleteSkillSwapRequest: async (requestId: string) => {
        const { error } = await supabase
            .from('skill_swap_requests')
            .delete()
            .eq('id', requestId);
        if (error) throw error;
        return true;
    },
    getNotifications: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },

    // Favorites
    getFavoriteProducts: async () => {
        const user = await api._getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('favorites')
            .select(`
                id,
                created_at,
                products (
                    id,
                    name,
                    description,
                    price,
                    category,
                    image_urls,
                    condition,
                    campus,
                    user_id
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Flatten the structure to return products directly
        return (data || []).map(f => f.products).filter(Boolean);
    },

    toggleFavorite: async (productId: string) => {
        const user = await api._getUser();
        if (!user) throw new Error("Not authenticated");

        // Check if already favorited
        const { data: existing } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('product_id', productId)
            .maybeSingle();

        if (existing) {
            // Remove favorite
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('id', existing.id);
            if (error) throw error;
            return { favorited: false };
        } else {
            // Add favorite
            const { error } = await supabase
                .from('favorites')
                .insert([{ user_id: user.id, product_id: productId }]);
            if (error) throw error;
            return { favorited: true };
        }
    },

    // Chat
    getConversations: async () => {
        const user = await api._getUser();
        if (!user) return [];

        // 1. Get IDs of conversations I'm in
        const { data: myConvos, error: myError } = await supabase
            .from('conversation_members')
            .select('conversation_id')
            .eq('user_id', user.id);

        if (myError) throw myError;
        if (!myConvos || myConvos.length === 0) return [];

        const ids = myConvos.map(c => c.conversation_id);

        // 2. Fetch those conversations with ALL members and messages
        const { data, error } = await supabase
            .from('conversations')
            .select(`
                *,
                conversation_members(
                    user_id,
                    last_read_at,
                    users(id, name, avatar_url, last_seen_at)
                ),
                recent_messages:messages(id, content, created_at, sender_id, deleted_by)
            `)
            .in('id', ids)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // 3. Process to add 'other_user' field and unread count
        const processedConversations = await Promise.all(data.map(async (c: any) => {
            const otherMember = c.conversation_members.find((m: any) => m.user_id !== user.id);
            const myMember = c.conversation_members.find((m: any) => m.user_id === user.id);

            // Filter out messages deleted by "me"
            const visibleMessages = (c.recent_messages || []).filter((msg: any) =>
                !msg.deleted_by || !msg.deleted_by.includes(user.id)
            ).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            const lastVisibleMsg = visibleMessages[0];

            // Calculate unread count (messages since last_read_at, not sent by me, and not deleted)
            const { count } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', c.id)
                .neq('sender_id', user.id)
                .gt('created_at', myMember?.last_read_at || c.created_at)
                .or(`deleted_by.is.null,not.deleted_by.cs.{${user.id}}`);

            return {
                ...c,
                other_user: otherMember ? otherMember.users : (c.is_group ? null : { name: "Unknown User" }),
                last_message: lastVisibleMsg || null,
                unreadCount: count || 0
            };
        }));

        return processedConversations;
    },

    getConversation: async (id: string) => {
        const user = await api._getUser();
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
            .from('conversations')
            .select(`
                *,
                conversation_members(
                    user_id,
                    last_read_at,
                    users(id, name, avatar_url, last_seen_at)
                ),
                last_message:messages(content, created_at, sender_id)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        const otherMember = data.conversation_members.find((m: any) => m.user_id !== user.id);
        return {
            ...data,
            other_user: otherMember ? otherMember.users : { name: "Unknown User" }
        };
    },

    updateLastSeen: async () => {
        const user = await api._getUser();
        if (!user) return;
        await supabase
            .from('users')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', user.id);
    },

    markChatAsRead: async (conversationId: string) => {
        const user = await api._getUser();
        if (!user) return;
        await supabase
            .from('conversation_members')
            .update({ last_read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .eq('user_id', user.id);
    },
    getMessages: async (conversationId: string) => {
        const user = await api._getUser();
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (user) {
            return (data || []).filter((msg: any) =>
                !msg.deleted_by || !msg.deleted_by.includes(user.id)
            );
        }
        return data;
    },
    sendMessage: async (conversationId: string, content: string, fileUrl?: string, fileType: string = 'text') => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const { data, error } = await supabase
            .from('messages')
            .insert([{
                conversation_id: conversationId,
                sender_id: user.id,
                content,
                file_url: fileUrl,
                file_type: fileType
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },
    deleteMessage: async (messageId: string) => {
        const user = await api._getUser();
        if (!user) return;

        // WhatsApp style 'Delete for Me' - Add user ID to deleted_by array
        const { data: msg, error: fetchError } = await supabase
            .from('messages')
            .select('deleted_by')
            .eq('id', messageId)
            .maybeSingle();

        if (fetchError) throw fetchError;
        if (!msg) return true; // Already gone

        const existing = msg.deleted_by || [];
        if (!existing.includes(user.id)) {
            const { error: updateError } = await supabase
                .from('messages')
                .update({ deleted_by: [...existing, user.id] })
                .eq('id', messageId);
            if (updateError) throw updateError;
        }
        return true;
    },
    deleteConversation: async (conversationId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Removing the user from conversation_members effectively deletes the chat 'for them'
        const { error } = await supabase
            .from('conversation_members')
            .delete()
            .eq('conversation_id', conversationId)
            .eq('user_id', user.id);

        if (error) throw error;
        return true;
    },
    createConversation: async (otherUserId: string, name?: string) => {
        const user = await api._getUser();
        if (!user) throw new Error("Not authenticated");

        if (user.id === otherUserId) throw new Error("You cannot chat with yourself");

        // Check if a direct conversation already exists
        // 1. Get my conversations
        const { data: myConvos } = await supabase
            .from('conversation_members')
            .select('conversation_id')
            .eq('user_id', user.id);

        if (myConvos && myConvos.length > 0) {
            const ids = myConvos.map(c => c.conversation_id);

            // 2. Check if other user is in any of these groups
            // We fetch ALL matches to find the most recent one (matching getConversations deduplication)
            const { data: matches } = await supabase
                .from('conversation_members')
                .select('conversation_id, conversations(is_group, created_at)')
                .in('conversation_id', ids)
                .eq('user_id', otherUserId);

            if (matches && matches.length > 0) {
                // Filter for DMs and Sort by created_at DESC
                const dms = matches
                    .map((m: any) => ({
                        id: m.conversation_id,
                        details: Array.isArray(m.conversations) ? m.conversations[0] : m.conversations
                    }))
                    .filter(c => c.details && !c.details.is_group)
                    .sort((a, b) => new Date(b.details.created_at).getTime() - new Date(a.details.created_at).getTime());

                if (dms.length > 0) {
                    // Re-fetch the full object to ensure it has all metadata
                    const fullList = await api.getConversations();
                    const match = fullList.find(c => String(c.id) === String(dms[0].id));
                    if (match) return match;

                    return { id: dms[0].id }; // Fallback
                }
            }
        }

        const { data: conv, error: convError } = await supabase
            .from('conversations')
            .insert([{ name, is_group: !!name, created_by: user.id }])
            .select()
            .single();

        if (convError) throw convError;

        const { error: memError } = await supabase
            .from('conversation_members')
            .insert([
                { conversation_id: conv.id, user_id: user.id },
                { conversation_id: conv.id, user_id: otherUserId }
            ]);

        if (memError) throw memError;

        // 3. Return enriched conversation (same format as getConversations)
        const { data: otherUser } = await supabase.from('users').select('id, name, avatar_url').eq('id', otherUserId).single();

        return {
            ...conv,
            other_user: otherUser || { name: "User" },
            conversation_members: [
                { user_id: user.id },
                { user_id: otherUserId, users: otherUser }
            ]
        };
    },

    // Study Buddy
    getStudyBuddies: async () => {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('study_buddy')
            .select('*, users(name, avatar_url, campus), study_group_members(count)')
            // Filter out expired sessions
            .or(`session_time.is.null,session_time.gt.${now}`)
            .order('created_at', { ascending: false });
        if (error) throw error;

        const campus = await api._getUserCampus();
        const processed = data.map((g: any) => ({
            ...g,
            members: g.study_group_members?.[0]?.count || 0
        }));

        if (campus) {
            return processed.sort((a: any, b: any) => {
                const aCampus = a.users?.campus;
                const bCampus = b.users?.campus;
                if (aCampus === campus && bCampus !== campus) return -1;
                if (aCampus !== campus && bCampus === campus) return 1;
                return 0;
            });
        }
        return processed;
    },
    joinStudyGroup: async (groupId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Check capacity and get conversation_id
        const { data: group, error: groupError } = await supabase
            .from('study_buddy')
            .select('max_members, conversation_id, study_group_members(count)')
            .eq('id', groupId)
            .single();

        if (groupError) throw groupError;
        const currentCount = group.study_group_members?.[0]?.count || 0;
        if (currentCount >= (group.max_members || 5)) {
            throw new Error("This study group is already full!");
        }

        await api.ensureUserProfile(user);

        const { data, error } = await supabase
            .from('study_group_members')
            .insert([{ group_id: groupId, user_id: user.id }])
            .select()
            .single();

        if (error) throw error;

        // Join Group Chat
        if (group.conversation_id) {
            await supabase.from('conversation_members').insert([{
                conversation_id: group.conversation_id,
                user_id: user.id
            }]).select();
        }

        // Notify host
        try {
            const { data: hostInfo } = await supabase.from('study_buddy').select('user_id, subject').eq('id', groupId).single();
            if (hostInfo) {
                await supabase.from('notifications').insert([{
                    user_id: hostInfo.user_id,
                    title: 'New Member',
                    content: `Someone joined your study group: ${hostInfo.subject}`,
                    link: '/study-buddy'
                }]);
            }
        } catch (err) {
            console.error("Failed to send notification:", err);
        }

        return data;
    },
    leaveStudyGroup: async (groupId: string) => {
        const user = await api._getUser();
        if (!user) throw new Error("Not authenticated");

        // Get conversation_id to leave chat too
        const { data: group } = await supabase.from('study_buddy').select('conversation_id').eq('id', groupId).single();

        const { error } = await supabase
            .from('study_group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', user.id);

        if (error) throw error;

        if (group?.conversation_id) {
            await supabase.from('conversation_members')
                .delete()
                .eq('conversation_id', group.conversation_id)
                .eq('user_id', user.id);
        }
    },
    getGroupMembership: async (groupId: string) => {
        const user = await api._getUser();
        if (!user) return null;

        await api.ensureUserProfile(user);

        const { data, error } = await supabase
            .from('study_group_members')
            .select('*')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) return null;
        return data;
    },

    // Creation Helpers (Unifying logic)
    createService: async (serviceData: any) => {
        const user = await api._getUser();
        if (!user) throw new Error("Not logged in");

        await api.ensureUserProfile(user);

        const { title, description, price, category, unit, skills, image_url } = serviceData;
        const { data, error } = await supabase
            .from('services')
            .insert([{
                title,
                description,
                price,
                category,
                unit,
                skills,
                image_url,
                user_id: user.id
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },
    createEvent: async (eventData: any) => {
        const user = await api._getUser();
        if (!user) throw new Error("Not logged in");

        await api.ensureUserProfile(user);

        const { title, name, description, category, type, date, time, location, college, participants, max_participants, fee, image_url, official_link } = eventData;
        const { data, error } = await supabase
            .from('events')
            .insert([{
                title: title || name,
                description,
                category,
                type,
                date,
                time,
                location,
                college,
                participants: participants || 0,
                max_participants,
                fee: fee || 0,
                image_url,
                official_link,
                user_id: user.id
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },
    createStudyBuddy: async (studyData: any) => {
        const user = await api._getUser();
        if (!user) throw new Error("Not logged in");

        await api.ensureUserProfile(user);

        const { subject, topic, description, college, max_members, schedule, location, level, session_time } = studyData;

        // 1. Create a Group Conversation
        const { data: conv, error: convError } = await supabase
            .from('conversations')
            .insert([{
                name: `Study Group: ${subject}`,
                is_group: true,
                created_by: user.id
            }])
            .select()
            .single();

        if (convError) throw convError;

        // 2. Add creator to conversation
        await supabase.from('conversation_members').insert([{
            conversation_id: conv.id,
            user_id: user.id
        }]);

        // 3. Create Study Buddy entry
        const { data, error } = await supabase
            .from('study_buddy')
            .insert([{
                subject,
                topic,
                description,
                college,
                max_members,
                schedule,
                location,
                level,
                session_time,
                conversation_id: conv.id,
                user_id: user.id
            }])
            .select()
            .single();

        if (error) throw error;

        // Auto-join creator as member
        await supabase.from('study_group_members').insert([{
            group_id: data.id,
            user_id: user.id
        }]);

        return data;
    },
    updateStudyBuddy: async (id: string, studyData: any) => {
        const { data: updated, error } = await supabase
            .from('study_buddy')
            .update(studyData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return updated;
    },
    deleteStudyBuddy: async (id: string) => {
        // Get conversation_id first to clean up chat
        const { data: group } = await supabase.from('study_buddy').select('conversation_id').eq('id', id).single();

        const { error } = await supabase.from('study_buddy').delete().eq('id', id);
        if (error) throw error;

        if (group?.conversation_id) {
            await supabase.from('conversations').delete().eq('id', group.conversation_id);
        }
        return true;
    },
    kickGroupMember: async (groupId: string, userId: string) => {
        const { error } = await supabase
            .from('study_group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);
        if (error) throw error;
        return true;
    },
    getGroupMembers: async (groupId: string) => {
        const { data, error } = await supabase
            .from('study_group_members')
            .select('*, users(id, name, avatar_url)')
            .eq('group_id', groupId);
        if (error) throw error;
        return data;
    },
    // Search Users
    searchUsers: async (query: string) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(20);
        if (error) throw error;

        const campus = await api._getUserCampus();
        if (campus) {
            return (data || []).sort((a: any, b: any) => {
                if (a.campus === campus && b.campus !== campus) return -1;
                if (a.campus !== campus && b.campus === campus) return 1;
                return 0;
            });
        }
        return data;
    },

    // Favorites
    getFavorites: async () => {
        const user = await api._getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('favorites')
            .select('product_id')
            .eq('user_id', user.id);

        if (error) throw error;
        return data.map((f: any) => f.product_id);
    },
    deleteService: async (id: string) => {
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) throw error;
        return true;
    },
    deleteEvent: async (id: string) => {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) throw error;
        return true;
    },
    deleteSkillSwap: async (id: string) => {
        const { error } = await supabase.from('skill_swap').delete().eq('id', id);
        if (error) throw error;
        return true;
    },
    deleteProduct: async (id: string) => {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        return true;
    },
    updateProduct: async (id: string, data: any) => {
        const { data: updated, error } = await supabase.from('products').update(data).eq('id', id).select().single();
        if (error) throw error;
        return updated;
    },
    updateService: async (id: string, data: any) => {
        const { data: updated, error } = await supabase.from('services').update(data).eq('id', id).select().single();
        if (error) throw error;
        return updated;
    },
    updateSkillSwap: async (id: string, data: any) => {
        const { data: updated, error } = await supabase.from('skill_swap').update(data).eq('id', id).select().single();
        if (error) throw error;
        return updated;
    },
    updateEvent: async (id: string, data: any) => {
        const { data: updated, error } = await supabase.from('events').update(data).eq('id', id).select().single();
        if (error) throw error;
        return updated;
    },
    registerForEvent: async (id: string) => {
        // First get current count
        const { data, error: fetchError } = await supabase
            .from('events')
            .select('participants')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const { error: updateError } = await supabase
            .from('events')
            .update({ participants: (data.participants || 0) + 1 })
            .eq('id', id);

        if (updateError) throw updateError;
        return true;
    },

    // Ratings
    submitRating: async (itemId: string, itemType: 'product' | 'service', rating: number) => {
        const user = await api._getUser();
        if (!user) throw new Error("Please log in to rate");

        const field = itemType === 'product' ? 'product_id' : 'service_id';

        const { error } = await supabase
            .from('ratings')
            .upsert([{
                user_id: user.id,
                [field]: itemId,
                rating
            }], { onConflict: `user_id,${field}` });

        if (error) throw error;
        return true;
    },
    getItemRating: async (itemId: string, itemType: 'product' | 'service') => {
        const field = itemType === 'product' ? 'product_id' : 'service_id';
        const { data, error } = await supabase
            .from('ratings')
            .select('rating')
            .eq(field, itemId);

        if (error) throw error;
        if (!data || data.length === 0) return { average: 0, count: 0 };

        const sum = data.reduce((acc, curr) => acc + curr.rating, 0);
        return {
            average: Math.round((sum / data.length) * 10) / 10,
            count: data.length
        };
    },
    getMyRating: async (itemId: string, itemType: 'product' | 'service') => {
        const user = await api._getUser();
        if (!user) return null;

        const field = itemType === 'product' ? 'product_id' : 'service_id';
        const { data, error } = await supabase
            .from('ratings')
            .select('rating')
            .eq(field, itemId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (error) throw error;
        return data ? data.rating : null;
    }
};
