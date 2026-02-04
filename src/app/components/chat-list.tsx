import { Conversation } from "./chat-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { useChat } from "../../context/ChatContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { toast } from "sonner";

export function ChatList({
  conversations,
  activeId,
  onSelectChat,
  loading,
}: {
  conversations: Conversation[];
  activeId?: string | number;
  onSelectChat: (conv: Conversation) => void;
  loading?: boolean;
}) {
  const { deleteConversationFromContext } = useChat();

  const handleDelete = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await deleteConversationFromContext(String(id));
      toast.success("Conversation deleted");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="animate-spin text-blue-600" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            No messages yet
          </div>
        ) : (
          conversations.map((c) => {
            const name = c.name || c.other_user?.name || "Unknown";
            const isActive = String(activeId) === String(c.id);

            return (
              <div
                key={c.id}
                className={`w-full px-5 py-4 text-left flex gap-4 hover:bg-slate-50 group cursor-pointer border-l-4 transition-all ${isActive ? "bg-blue-50/50 border-blue-600" : "border-transparent"}`}
                onClick={() => onSelectChat({ ...c })}
              >
                <div className="shrink-0 relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={c.other_user?.avatar_url} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {name[0]}
                    </AvatarFallback>
                  </Avatar>
                  {!c.is_group && c.other_user?.last_seen_at && (
                    new Date().getTime() - new Date(c.other_user.last_seen_at).getTime() < 120000 ? (
                      <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></span>
                    ) : null
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {c.last_message?.content ?? "No messages"}
                  </p>
                </div>

                <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center">
                  <button
                    onClick={(e) => handleDelete(e, c.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
