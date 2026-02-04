import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Header } from "./components/header";
import { GamificationPanel } from "./components/gamification-panel";
import { ChatDialog } from "./components/chat-dialog";
import { AddListingDialog } from "./components/add-listing-dialog";
import { Toaster } from "./components/ui/sonner";
import { ArrowLeft, MessageCircle, Loader2 } from "lucide-react";
import { Button } from "./components/ui/button";

import { toast } from "sonner";
import { api } from "../utils/api";
import { ChatList } from "./components/chat-list";
import { ChatWindow } from "./components/chat-window";
import { LayoutDashboard, Heart, MessageSquare, ShoppingBag, Trophy } from "lucide-react";

import { useChat } from "../context/ChatContext";

/* ---------------- TYPES ---------------- */
interface FavoriteProduct {
  id: string;
  name: string;
  price: number;
}

const MyListings = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyListings = async () => {
      try {
        const data = await api.getMyProducts();
        setListings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyListings();
  }, []);

  if (loading) return (
    <div className="flex justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="space-y-4">
      {listings.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed">
          <ShoppingBag className="mx-auto h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 font-medium">No active listings yet</p>
          <p className="text-xs text-gray-400 mt-1">Items you post for sale will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((p) => (
            <div key={p.id} className="group flex justify-between items-center bg-white border p-4 rounded-xl hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0">
                  {p.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 leading-tight">{p.name}</p>
                  <p className="text-xs text-gray-500 mt-1">₹{p.price} · <span className="text-blue-600 font-medium">{p.category}</span></p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-green-100 text-green-700 rounded-lg">
                Active
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ======================================================= */

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const tabParam = params.get("tab") as "overview" | "favorites" | "messages" | null;
  const convIdParam = params.get("convId");

  const activeTabRef = useRef<string | null>(null);
  const processedMessageRef = useRef<string>("");

  const [activeTab, setActiveTab] = useState<"overview" | "favorites" | "messages">(tabParam || "overview");

  // Product context for chat
  const [chatProduct, setChatProduct] = useState<{ productTitle: string; productPrice: number; productImage?: string } | null>(null);

  const [addListingOpen, setAddListingOpen] = useState(false);

  const [favorites, setFavorites] = useState<any[]>([]);
  const [favLoading, setFavLoading] = useState(false);

  // Use Chat Context
  const {
    conversations,
    activeChat,
    setActiveChat,
    loading: msgLoading,
    fetchConversations,
    openChat,
    clearChat,
    sendMessage,
    sendMessageToId
  } = useChat();

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lb, user] = await Promise.all([
          api.getLeaderboard(),
          api.getMe()
        ]);
        setLeaderboard(lb);
        setMe(user);
      } catch (err) {
        console.error("Dashboard init error:", err);
      }
    };
    fetchData();
  }, []);

  // Sync Tab and Conversation State
  useEffect(() => {
    // 1. Prioritize Tab Update
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
      return;
    }

    // 2. Fetch Data
    if (activeTab === "messages") {
      fetchConversations();
    } else if (activeTab === "favorites") {
      setFavLoading(true);
      api.getFavoriteProducts()
        .then(setFavorites)
        .catch(console.error)
        .finally(() => setFavLoading(false));
    }


    // 3. Handle Auto-Open & Context Persistence
    const state = location.state as { autoOpen?: any; initialMessage?: string; initialImage?: string; productContext?: any };

    if (activeTab === "messages") {
      if (state?.autoOpen) {
        const convId = String(state.autoOpen.id);
        openChat(state.autoOpen);

        if (state.productContext) {
          setChatProduct(state.productContext);
          // Persist context for this conversation
          localStorage.setItem(`chat_context_${convId}`, JSON.stringify(state.productContext));
        }

        if (state.initialMessage) {
          const signature = `${convId}-${state.initialMessage.substring(0, 20)}`;
          if (processedMessageRef.current !== signature) {
            processedMessageRef.current = signature;
            const image = state.initialImage;
            sendMessageToId(convId, state.initialMessage, image, image ? "image" : undefined)
              .then(() => {
                navigate(location.pathname + location.search, { replace: true, state: {} });
              })
              .catch(err => {
                console.error("Failed auto-send:", err);
                processedMessageRef.current = "";
              });
          }
        }
      } else if (convIdParam && conversations.length > 0) {
        // Just open the chat if found - context is handled by separate effect
        const found = conversations.find((c: any) => String(c.id) === String(convIdParam));
        if (found) {
          openChat(found);
        }
      }
    }
  }, [activeTab, tabParam, convIdParam, conversations.length, location.state]);

  // Dedicated Effect for Context Restoration (Handles Refresh Race Condition)
  useEffect(() => {
    if (activeTab === "messages" && convIdParam) {
      // Don't overwrite if we just set it via state
      const state = location.state as { productContext?: any };
      if (state?.productContext) return;

      const saved = localStorage.getItem(`chat_context_${convIdParam}`);
      if (saved) {
        try {
          //Only set if not already set to avoid flicker, or strictly sync?
          // Strictly sync ensures URL -> Storage source of truth navigation
          setChatProduct(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse context", e);
        }
      } else {
        // If nothing in storage and we are just loading URL, ensure it's cleared 
        // (unless we are in the middle of a flow, but this is safe for direct URL access)
        setChatProduct(null);
      }
    }
  }, [convIdParam, activeTab, location.state]);

  const handleRequestMessage = async (productId: string) => {
    const toastId = toast.loading("Connecting to seller...");
    try {
      const p = await api.getProduct(productId);
      const conv = await api.createConversation(p.user_id);
      toast.dismiss(toastId);

      // Navigate with state for robust auto-open
      navigate(`/dashboard?tab=messages&convId=${conv.id}`, {
        state: {
          autoOpen: conv,
          productContext: {
            productTitle: p.name,
            productPrice: p.price,
            productImage: p.image_urls?.[0]
          },
          initialMessage: `Hello, I am interested in your product: ${p.name}.\n\n${p.description || "No description."}\n\nPlease share availability and price details.`,
          initialImage: p.image_urls?.[0]
        }
      });
      setActiveTab("messages");
    } catch (err: any) {
      toast.error(err.message || "Failed to contact seller", { id: toastId });
      console.error(err);
    }
  };

  const handleRemoveFavorite = async (e: any, productId: string) => {
    e.stopPropagation();
    try {
      await api.toggleFavorite(productId);
      setFavorites(prev => prev.filter(p => p.id !== productId));
      toast.success("Removed from favorites");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header
        onSearch={() => { }}
        onChatClick={() => setActiveTab("messages")}
        onAddListingClick={() => setAddListingOpen(true)}
        onProfileClick={() => navigate("/profile")}
      />

      <div className={`mx-auto h-full ${activeTab === "messages" ? "max-w-none" : "max-w-7xl px-4 sm:px-6 lg:px-8 py-8"}`}>
        <div className={`flex flex-col md:flex-row h-full gap-8 ${activeTab === "messages" ? "gap-0" : ""}`}>

          {/* SIDEBAR NAVIGATION (Desktop Only) */}
          <aside className={`shrink-0 transition-all duration-300 hidden md:block ${activeTab === "messages" ? "w-20 md:w-20 border-r bg-white h-[calc(100vh-64px)]" : "w-full md:w-64 space-y-2"}`}>
            <div className={`flex flex-col h-full ${activeTab === "messages" ? "items-center py-4" : "p-4 bg-white rounded-2xl shadow-sm border border-slate-200"}`}>
              <nav className={`space-y-2 w-full ${activeTab === "messages" ? "flex flex-col items-center" : ""}`}>
                {[
                  { id: "overview", icon: LayoutDashboard, label: "Overview" },
                  { id: "favorites", icon: Heart, label: "Favorites" },
                  { id: "messages", icon: MessageSquare, label: "Inbox" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/dashboard?tab=${item.id}`)}
                    title={item.label}
                    className={`flex items-center gap-3 transition-all ${activeTab === "messages"
                      ? `p-3 rounded-xl ${activeTab === item.id ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "text-slate-400 hover:bg-slate-50"}`
                      : `w-full px-4 py-3 text-sm font-semibold rounded-xl ${activeTab === item.id ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "text-slate-600 hover:bg-slate-50"}`
                      }`}
                  >
                    <item.icon size={activeTab === "messages" ? 22 : 18} />
                    {activeTab !== "messages" && <span>{item.label}</span>}
                  </button>
                ))}
              </nav>

              {activeTab !== "messages" && (
                <div className="mt-4">
                  <GamificationPanel />
                </div>
              )}
            </div>
          </aside>

          {/* MOBILE BOTTOM NAV */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-16 flex items-center justify-around px-4 z-[60] shadow-lg">
            {[
              { id: "overview", icon: LayoutDashboard, label: "Home" },
              { id: "favorites", icon: Heart, label: "Favs" },
              { id: "messages", icon: MessageSquare, label: "Inbox" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/dashboard?tab=${item.id}`)}
                className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? "text-blue-600" : "text-slate-400"}`}
              >
                <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                <span className="text-[10px] font-bold uppercase tracking-wide">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* MIDDLE: CHAT LIST (Only for messages tab) */}
          {activeTab === "messages" && (
            <aside className={`w-full md:w-[350px] border-r bg-white h-[calc(100vh-64px)] md:block ${activeChat ? "hidden" : "block"}`}>
              <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                  <h2 className="font-bold text-xl">Messages</h2>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ChatList
                    conversations={conversations}
                    activeId={activeChat?.id}
                    onSelectChat={(c) => {
                      const convId = String(c.id);
                      setChatProduct(null);
                      const saved = localStorage.getItem(`chat_context_${convId}`);
                      if (saved) {
                        try {
                          setChatProduct(JSON.parse(saved));
                        } catch (e) {
                          console.error("Failed to parse context", e);
                        }
                      }
                      openChat(c);
                    }}
                    loading={msgLoading}
                  />
                </div>
              </div>
            </aside>
          )}

          {/* MAIN CONTENT AREA */}
          <main className={`flex-1 min-w-0 h-[calc(100vh-64px)] pb-16 md:pb-0 ${activeTab === "messages" ? "bg-white" : ""} ${activeTab === "messages" && !activeChat ? "hidden md:flex" : "block"}`}>
            {activeTab === "overview" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header>
                  <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
                  <p className="text-slate-500 text-sm mt-1">Manage your activity and track your performance.</p>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <section className="space-y-4">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                          <ShoppingBag className="text-blue-500" size={20} />
                          My Listings
                        </h3>
                      </div>
                      <MyListings />
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                      <h3 className="font-bold text-slate-900 mb-4">🏆 XP Leaderboard</h3>
                      <div className="space-y-3">
                        {leaderboard.map((user, idx) => (
                          <div key={user.id} className={`flex items-center justify-between p-3 rounded-xl border ${user.id === me?.id ? "bg-blue-50 border-blue-200" : "bg-white border-slate-100"}`}>
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                                {idx + 1}
                              </span>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{user.name}{user.id === me?.id && " (You)"}</p>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-tight">{user.xp} XP · LVL {user.level || 1}</p>
                              </div>
                            </div>
                            {idx < 3 && <Trophy size={16} className={idx === 0 ? "text-yellow-500" : idx === 1 ? "text-slate-400" : "text-amber-600"} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 h-fit">
                    <h3 className="font-bold text-slate-900 mb-4">🧪 Stats & Activity</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Sales</p>
                        <p className="text-2xl font-black text-slate-900">₹0</p>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trust Score</p>
                        <p className="text-2xl font-black text-green-600">{me?.trust_score || 0}%</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === "favorites" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header>
                  <h1 className="text-2xl font-bold text-slate-900">Favorite Items</h1>
                  <p className="text-slate-500 text-sm mt-1">Saved products you're interested in.</p>
                </header>

                {favLoading ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>
                ) : favorites.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-dashed text-slate-400">
                    <Heart size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No favorites yet. Go browse the marketplace!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {favorites.map(p => (
                      <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden group hover:shadow-xl transition-all duration-300">
                        <div className="h-40 bg-slate-100 relative overflow-hidden">
                          <img
                            src={p.image_urls?.[0] || 'https://via.placeholder.com/400x300'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            alt=""
                          />
                          <div className="absolute top-3 right-3">
                            <button
                              className="h-8 w-auto px-3 rounded-full bg-white/90 backdrop-blur shadow-sm flex items-center justify-center text-red-500 hover:bg-red-50 text-xs font-bold gap-1"
                              onClick={(e) => handleRemoveFavorite(e, p.id)}
                            >
                              <span className="mb-[1px]">✕</span> Remove
                            </button>
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-slate-900 line-clamp-1">{p.name}</h4>
                          <p className="text-blue-600 font-extrabold text-sm mt-1">₹{p.price}</p>
                          <Button size="sm" className="w-full mt-4 bg-slate-900 hover:bg-black rounded-xl" onClick={() => handleRequestMessage(p.id)}>
                            Chat with Seller
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "messages" && (
              <div className="h-full flex flex-col min-w-0">
                {activeChat ? (
                  <ChatWindow
                    key={activeChat.id}
                    conversation={activeChat}
                    product={chatProduct}
                    onBack={() => {
                      clearChat();
                      setChatProduct(null);
                      navigate("/dashboard?tab=messages", { replace: true });
                    }}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 bg-slate-50">
                    <div className="h-20 w-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                      <MessageSquare size={32} className="text-blue-500" />
                    </div>
                    <p className="font-bold text-slate-900 text-xl">Your Messages</p>
                    <p className="text-sm text-center max-w-xs mt-2">Select a conversation from the list to start chatting.</p>

                    {/* Mobile List View Fallback */}
                    <div className="md:hidden mt-8 w-full">
                      <ChatList
                        conversations={conversations}
                        onSelectChat={(c) => {
                          setChatProduct(null);
                          openChat(c);
                        }}
                        loading={msgLoading}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <AddListingDialog
        open={addListingOpen}
        onOpenChange={setAddListingOpen}
        defaultTab="product"
      />
      <Toaster />
    </div>
  );
}
