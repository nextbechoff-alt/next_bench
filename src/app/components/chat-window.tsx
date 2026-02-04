import { ArrowLeft, Image as ImageIcon, Smile, Send, X, Loader2, Trash2, Users } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Conversation } from "./chat-dialog";
import { api } from "../../utils/api";
import { storage } from "../../utils/storage";
import { toast } from "sonner";
import { useChat } from "../../context/ChatContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface Product {
  productTitle: string;
  productPrice: number;
  productImage?: string;
}

export function ChatWindow({
  conversation,
  product,
  onBack,
}: {
  conversation: Conversation;
  product: Product | null;
  onBack: () => void;
}) {
  const {
    messages,
    sendMessage,
    loading,
    me,
    startTyping,
    stopTyping,
    typingUsers,
    openChat,
    deleteMessageFromContext,
    deleteConversationFromContext
  } = useChat();

  const [input, setInput] = useState("");
  const [showMembers, setShowMembers] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef<HTMLDivElement>(null);

  // Close members on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (membersRef.current && !membersRef.current.contains(event.target as Node)) {
        setShowMembers(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ SYNC WITH CONTEXT
  useEffect(() => {
    if (conversation?.id) {
      openChat(conversation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id]); // Intentionally limited deps to prevent loops

  // ✅ AUTO SCROLL
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const content = input;
    setInput("");
    stopTyping();

    try {
      await sendMessage(content);
    } catch {
      toast.error("Failed to send message");
      setInput(content);
    }
  };

  const handleSendImage = async (file: File) => {
    try {
      const path = `chat/${conversation.id}/${Date.now()}_${file.name}`;
      await storage.uploadMaterial(file, path);
      const url = storage.getPublicUrl(path);
      await sendMessage("Sent an image", url, "image");
      toast.success("Image sent!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    }
  };

  const handleDeleteConversation = async () => {
    if (!window.confirm("Delete this entire chat history?")) return;
    try {
      await deleteConversationFromContext(String(conversation.id));
      toast.success("Chat deleted");
      onBack();
    } catch {
      toast.error("Failed to delete chat");
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (e.target.value.length > 0) {
      startTyping();
    } else {
      stopTyping();
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Back button for mobile */}
          <button
            onClick={onBack}
            className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          >
            <ArrowLeft size={20} />
          </button>

          <div className={`flex items-center gap-2 md:gap-3 cursor-pointer overflow-hidden`} onClick={() => conversation.is_group && setShowMembers(!showMembers)}>
            <Avatar className="h-9 w-9">
              <AvatarImage src={conversation.other_user?.avatar_url} />
              <AvatarFallback className="bg-blue-600 text-white">
                {(conversation.name || conversation.other_user?.name || "C")[0]}
              </AvatarFallback>
            </Avatar>

            <div>
              <p className="font-semibold text-slate-900 leading-tight">
                {conversation.name || conversation.other_user?.name || "Chat"}
              </p>
              <p className={`text-[11px] font-medium ${typingUsers.length > 0 || (conversation.other_user?.last_seen_at && new Date().getTime() - new Date(conversation.other_user.last_seen_at).getTime() < 120000) ? "text-green-600" : "text-gray-400"}`}>
                {typingUsers.length > 0 ? "Typing..." : (
                  conversation.is_group
                    ? `${conversation.conversation_members?.length || 0} members`
                    : (conversation.other_user?.last_seen_at && new Date().getTime() - new Date(conversation.other_user.last_seen_at).getTime() < 120000 ? "Online" : "Offline")
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {conversation.is_group && (
            <button
              onClick={() => setShowMembers(!showMembers)}
              className={`p-2 rounded-full transition-colors ${showMembers ? "bg-blue-50 text-blue-600" : "text-gray-400 hover:bg-gray-100"}`}
              title="View members"
            >
              <Users size={20} />
            </button>
          )}

          <button
            onClick={handleDeleteConversation}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="Delete conversation"
          >
            <Trash2 size={20} />
          </button>
        </div>

        {/* MEMBERS DROPDOWN */}
        {showMembers && conversation.is_group && (
          <div
            ref={membersRef}
            className="absolute top-16 right-4 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden"
          >
            <div className="p-3 border-b bg-slate-50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Group Members</p>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {conversation.conversation_members?.map((member) => {
                const isOnline = member.users.last_seen_at && (new Date().getTime() - new Date(member.users.last_seen_at).getTime() < 120000);
                return (
                  <div key={member.user_id} className="flex items-center gap-3 p-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors">
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.users.avatar_url} />
                        <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">
                          {member.users.name?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {member.user_id === me?.id ? "You" : member.users.name}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {product && (
        <div className="border-b bg-gray-50 px-4 py-2 flex items-center gap-3">
          {product.productImage && (
            <img src={product.productImage} alt={product.productTitle} className="w-12 h-12 rounded-md object-cover border border-slate-200" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-900">{product.productTitle}</p>
            <p className="text-xs text-blue-600 font-bold">₹{product.productPrice}</p>
          </div>
        </div>
      )}

      {/* MESSAGES */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#f0f2f5]"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-gray-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-300">
            <div className="p-4 rounded-full bg-slate-50/50 mb-4">
              <Smile size={48} className="text-slate-300" />
            </div>
            <p className="text-slate-400 font-medium tracking-wide">No messages yet</p>
            <p className="text-slate-300 text-xs mt-1">Start a conversation to see it here</p>
          </div>
        ) : (
          messages.map((msg) => {
            const fromMe = msg.sender_id === "me" || msg.sender_id === me?.id;
            const msgKey = msg.id.startsWith('tmp-') ? `${msg.id}-${msg.content.slice(0, 10)}` : msg.id;
            return (
              <div key={msgKey} className={`flex gap-3 group ${fromMe ? "justify-end" : "justify-start"}`}>

                {/* Avatar for other user */}
                {!fromMe && (
                  <Avatar className="h-8 w-8 mt-1 border">
                    <AvatarImage src={conversation.other_user?.avatar_url} />
                    <AvatarFallback className="bg-gray-200 text-gray-500 text-xs font-bold">
                      {(conversation.other_user?.name || "U")[0]}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className={`relative max-w-[75%] group`}>
                  <div
                    className={`rounded-2xl px-4 py-2.5 shadow-sm text-[15px] ${fromMe
                      ? "bg-blue-600 text-white rounded-tr-none"
                      : "bg-white text-slate-800 rounded-tl-none border border-slate-100"
                      }`}
                  >
                    {msg.file_url && (
                      <img src={msg.file_url} className="rounded-xl max-h-96 w-full object-cover mb-2 border border-black/5" />
                    )}
                    {msg.content && <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                  </div>

                  {/* Delete Button (Only for own messages) */}
                  {fromMe && (
                    <button
                      onClick={() => {
                        if (window.confirm("Delete for me?")) {
                          deleteMessageFromContext(msg.id)
                            .then(() => toast.success("Message deleted"))
                            .catch(() => toast.error("Failed to delete"));
                        }
                      }}
                      className={`absolute top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all scale-90 hover:scale-100 ${fromMe ? "-left-11" : "-right-11"} opacity-100 md:opacity-0 md:group-hover:opacity-100`}
                      title="Delete message"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Avatar for me */}
                {fromMe && (
                  <Avatar className="h-8 w-8 mt-1 border">
                    <AvatarImage src={me?.avatar_url} />
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs font-bold">
                      {(me?.name || "Me")[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* INPUT */}
      <div className="border-t px-4 py-3 flex gap-3 bg-white">
        <label className="cursor-pointer p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
          <ImageIcon size={22} />
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => e.target.files && handleSendImage(e.target.files[0])}
          />
        </label>

        <button className="text-gray-500 hover:text-blue-600 p-2 rounded-full transition-colors hidden sm:block">
          <Smile size={22} />
        </button>

        <input
          value={input}
          onChange={handleTyping}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
          className="flex-1 border-gray-200 border rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          placeholder="Type a message..."
        />

        <button onClick={handleSendMessage} className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 shadow-md shadow-blue-200 transition-all active:scale-95">
          <Send size={18} />
        </button>
      </div>
    </div >
  );
}
