import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { api } from "../../utils/api";
import { Dialog, DialogContent } from "./ui/dialog";
import { ChatList } from "./chat-list";
import { ChatWindow } from "./chat-window";

export interface Conversation {
  id: string | number;
  name?: string;
  is_group: boolean;
  other_user?: {
    id: string | number;
    name: string;
    avatar_url?: string;
    last_seen_at?: string;
  };
  conversation_members?: Array<{
    user_id: string;
    last_read_at?: string;
    users: { id: string; name: string; avatar_url?: string; last_seen_at?: string };
  }>;
  last_message?: {
    content: string;
    created_at: string;
  };
  unreadCount?: number;
}

import { useChat } from "../../context/ChatContext";

export function ChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const {
    conversations,
    activeChat,
    setActiveChat,
    loading,
    fetchConversations,
    openChat
  } = useChat();

  const [searchParams] = useSearchParams();
  const convIdFromUrl = searchParams.get("convId");

  const location = useLocation();
  const product = location.state || null;

  // 🔹 Fetch conversations when dialog opens
  useEffect(() => {
    if (open) {
      fetchConversations();
    }
  }, [open]);

  // 🔥 CRITICAL FIX: auto-select chat from URL
  useEffect(() => {
    if (!open || !convIdFromUrl || conversations.length === 0) return;

    const match = conversations.find(
      (c) => String(c.id) === String(convIdFromUrl)
    );

    if (match && (!activeChat || String(activeChat.id) !== String(convIdFromUrl))) {
      openChat(match);
    }
  }, [open, convIdFromUrl, conversations]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          !w-[98vw]
          !max-w-[1200px]
          h-[85vh]
          p-0
          overflow-hidden
          rounded-xl
        "
      >
        <div className="flex h-full min-w-0 bg-white">

          {/* LEFT – CHAT LIST */}
          <div
            className={`border-r w-72 shrink-0 ${activeChat ? "hidden md:block" : "block"
              }`}
          >
            <ChatList
              conversations={conversations}
              activeId={activeChat?.id}
              onSelectChat={openChat}
              loading={loading}
            />
          </div>

          {/* RIGHT – CHAT WINDOW */}
          <div className="flex-1 min-w-0">
            {activeChat ? (
              <ChatWindow
                conversation={activeChat}
                product={product}
                onBack={() => setActiveChat(null)}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Select a conversation
              </div>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
