import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "../utils/api";
import { createSocket } from "../utils/socket";

export interface Conversation {
  id: string | number;
  name?: string;
  is_group: boolean;
  other_user?: { id: string | number; name: string; avatar_url?: string; last_seen_at?: string };
  conversation_members?: Array<{
    user_id: string;
    last_read_at?: string;
    users: { id: string; name: string; avatar_url?: string; last_seen_at?: string };
  }>;
  last_message?: { content: string; created_at: string };
  unreadCount?: number;
}

export interface Message {
  id: string;
  sender_id: string;
  content: string;
  conversation_id: string;
  created_at?: string;
  optimistic?: boolean;
  file_url?: string;
}

interface ChatContextType {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeChat: Conversation | null;
  messages: Message[];
  loading: boolean;
  typingUsers: string[];
  me: any;
  totalUnreadCount: number;

  fetchConversations(): Promise<void>;
  openChat(conv: Conversation): Promise<void>;
  clearChat(): void;
  sendMessage(content: string, fileUrl?: string, fileType?: string): Promise<void>;
  startTyping(): void;
  stopTyping(): void;
  setActiveChat: (chat: Conversation | null) => void;
  deleteMessageFromContext: (messageId: string) => Promise<void>;
  deleteConversationFromContext: (conversationId: string) => Promise<void>;
  sendMessageToId(conversationId: string, content: string, fileUrl?: string, fileType?: string): Promise<void>;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  const [me, setMe] = useState<any>(null);

  const socketRef = useRef<any>(null);
  const loadingSessionRef = useRef<number>(0);

  // 👤 GET ME
  useEffect(() => {
    api.getMe().then(setMe).catch(() => setMe(null));
  }, []);

  // 📡 PRESENCE (Update Last Seen Every 30s)
  useEffect(() => {
    if (!me) return;
    api.updateLastSeen(); // Initial
    const interval = setInterval(() => api.updateLastSeen(), 30000);
    return () => clearInterval(interval);
  }, [me?.id]);

  // 🔐 INIT SOCKET (JWT)
  useEffect(() => {
    const token = localStorage.getItem("token") || me?.access_token; // Try both
    if (!token) return;

    if (!socketRef.current) {
      socketRef.current = createSocket(token);

      // Handle re-join on reconnect
      socketRef.current.on("connect", () => {
        console.log("✅ Socket connected");
        if (activeConversationId) {
          socketRef.current.emit("join_conversation", activeConversationId);
        }
      });

      // Handle connection errors
      socketRef.current.on("connect_error", (error: any) => {
        console.error("❌ Socket connection error:", error.message);
      });

      socketRef.current.on("disconnect", (reason: string) => {
        console.warn("⚠️ Socket disconnected:", reason);
      });
    }

    const socket = socketRef.current;

    const onNewMessage = (msg: Message) => {
      // replace optimistic message if exists
      setMessages((prev) => {
        const isFromMe = msg.sender_id === me?.id || msg.sender_id === "me";

        // Match optimistic by content (since ID is temporary)
        const optimisticIndex = prev.findIndex(
          (m) => m.optimistic && m.content === msg.content && isFromMe
        );

        if (optimisticIndex !== -1) {
          const copy = [...prev];
          copy[optimisticIndex] = msg;
          return copy;
        }

        // Avoid adding the same message twice (if echo arrives before/during optimistic update)
        if (prev.some(m => m.id === msg.id)) return prev;

        return [...prev, msg];
      });

      // Update conversations list with last message and jump to top
      setConversations((prev) => {
        const convId = String(msg.conversation_id);
        const other = prev.filter(c => String(c.id) !== convId);
        const found = prev.find(c => String(c.id) === convId);

        if (found) {
          const isFromMe = msg.sender_id === me?.id || msg.sender_id === "me";
          const updated = {
            ...found,
            last_message: {
              content: msg.content,
              created_at: msg.created_at || new Date().toISOString()
            },
            unreadCount: (found.unreadCount || 0) + (!isFromMe && convId !== String(activeConversationId) ? 1 : 0)
          };
          return [updated, ...other];
        } else {
          // If conversation isn't in list, we might need to fetch it or wait for next refresh
          // For now, we just return prev to avoid breaking order
          fetchConversations().catch(console.error);
        }
        return prev;
      });

      // Active chat received a message, mark as read immediately in DB
      if (String(msg.conversation_id) === String(activeConversationId) && msg.sender_id !== me?.id) {
        api.markChatAsRead(msg.conversation_id).catch(console.error);
      }
    };

    const onTyping = ({ userId, conversationId }: any) => {
      if (String(conversationId) === String(activeConversationId)) {
        setTypingUsers((prev) => [...new Set([...prev, userId])]);
      }
    };

    const onStopTyping = ({ userId, conversationId }: any) => {
      setTypingUsers((prev) => prev.filter((id) => id !== userId));
    };

    socket.on("new_message", onNewMessage);
    socket.on("typing", onTyping);
    socket.on("stop_typing", onStopTyping);

    // 🚪 Join room
    if (activeConversationId) {
      socket.emit("join_conversation", activeConversationId);
    }

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("typing", onTyping);
      socket.off("stop_typing", onStopTyping);
      if (activeConversationId) {
        socket.emit("leave_conversation", activeConversationId);
      }
    };
  }, [activeConversationId, me?.id]);



  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // 🧮 CALCULATE TOTAL UNREAD
  useEffect(() => {
    const total = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
    setTotalUnreadCount(total);
  }, [conversations]);

  // 📥 conversations
  const fetchConversations = async () => {
    try {
      const data = await api.getConversations();

      setConversations((prev) => {
        const enriched = data.map((c: Conversation) => ({ ...c, unreadCount: 0 }));
        // If we have an active chat that's not in the new data, keep it!
        if (activeChat && !enriched.some((c: any) => String(c.id) === String(activeChat.id))) {
          return [activeChat, ...enriched];
        }
        return enriched;
      });
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  };

  // 📂 open chat
  const openChat = async (conv: Conversation) => {
    const id = String(conv.id);
    if (!id) return;

    setActiveConversationId(id);
    setActiveChat({ ...conv, id });
    setMessages([]);
    setLoading(true);

    // Race condition guard
    const session = ++loadingSessionRef.current;

    // Ensure it's in the conversations list immediately for UI consistency
    setConversations((prev) => {
      if (prev.some((c) => String(c.id) === id)) return prev;
      return [conv, ...prev];
    });

    if (socketRef.current) {
      socketRef.current.emit("join_conversation", id);
    }

    try {
      const data = await api.getMessages(id);

      // Only apply results if this is still the active session
      if (session === loadingSessionRef.current) {
        setMessages(data);
        // Mark as read in DB
        await api.markChatAsRead(id);
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      if (session === loadingSessionRef.current) {
        setLoading(false);
      }
    }

    // reset unread locally
    setConversations((prev) =>
      prev.map((c) => (String(c.id) === id ? { ...c, unreadCount: 0 } : c))
    );
  };

  const clearChat = () => {
    if (activeConversationId) {
      socketRef.current?.emit("leave_conversation", activeConversationId);
    }
    setActiveConversationId(null);
    setActiveChat(null);
    setMessages([]);
  };

  // 🚀 OPTIMISTIC SEND
  const sendMessage = async (content: string, fileUrl?: string, fileType?: string) => {
    if (!activeConversationId) return;

    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      sender_id: "me",
      content,
      conversation_id: activeConversationId,
      optimistic: true,
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const saved = await api.sendMessage(activeConversationId, content, fileUrl, fileType);
      socketRef.current?.emit("send_message", saved);

      // Reorder conversation to top
      setConversations(prev => {
        const other = prev.filter(c => String(c.id) !== activeConversationId);
        const found = prev.find(c => String(c.id) === activeConversationId);
        if (found) {
          const updated = {
            ...found,
            last_message: { content, created_at: new Date().toISOString() }
          };
          return [updated, ...other];
        }
        return prev;
      });
    } catch (err) {
      console.error("Failed to send message", err);
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      throw err;
    }
  };

  const sendMessageToId = async (conversationId: string, content: string, fileUrl?: string, fileType?: string) => {
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      sender_id: "me",
      content,
      conversation_id: conversationId,
      optimistic: true,
    };

    // Only update messages list if this is the active chat
    if (String(activeConversationId) === String(conversationId)) {
      setMessages((prev) => [...prev, optimistic]);
    }

    try {
      const saved = await api.sendMessage(conversationId, content, fileUrl, fileType);
      socketRef.current?.emit("send_message", saved);

      // Reorder conversation to top
      setConversations(prev => {
        const other = prev.filter(c => String(c.id) !== String(conversationId));
        const found = prev.find(c => String(c.id) === String(conversationId));
        if (found) {
          const updated = {
            ...found,
            last_message: { content, created_at: new Date().toISOString() }
          };
          return [updated, ...other];
        }
        return prev;
      });
    } catch (err) {
      console.error("Failed to send message to id", err);
      if (String(activeConversationId) === String(conversationId)) {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
      throw err;
    }
  };

  const startTyping = () => {
    if (activeConversationId && socketRef.current) {
      socketRef.current.emit("typing", { conversationId: activeConversationId });
    }
  };

  const stopTyping = () => {
    if (activeConversationId && socketRef.current) {
      socketRef.current.emit("stop_typing", { conversationId: activeConversationId });
    }
  };

  const deleteMessageFromContext = async (messageId: string) => {
    try {
      await api.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      // Update conversations list (the last message might have changed)
      fetchConversations().catch(console.error);
    } catch (err) {
      console.error("Failed to delete message", err);
      throw err;
    }
  };

  const deleteConversationFromContext = async (conversationId: string) => {
    try {
      await api.deleteConversation(conversationId);
      setConversations((prev) => prev.filter((c) => String(c.id) !== String(conversationId)));
      if (activeConversationId === conversationId) {
        clearChat();
      }
    } catch (err) {
      console.error("Failed to delete conversation", err);
      throw err;
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        activeChat,
        messages,
        loading,
        typingUsers,
        me,
        totalUnreadCount,
        fetchConversations,
        openChat,
        clearChat,
        sendMessage,
        startTyping,
        stopTyping,
        setActiveChat,
        deleteMessageFromContext,
        deleteConversationFromContext,
        sendMessageToId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
}
