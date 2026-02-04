import { useState, useEffect } from "react";
import {
  useNavigate,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import { Header } from "./components/header";
import { NavigationTabs, TabType } from "./components/navigation-tabs";
import { HeroBanner } from "./components/hero-banner";
import { MarketplaceSection } from "./components/marketplace-section";
import { FreelanceSection } from "./components/freelance-section";
import { EventsSection } from "./components/events-section";
import { SkillSwapSection } from "./components/skill-swap-section";
import { StudyBuddySection } from "./components/study-buddy-section";
import { ProfileSection } from "./components/profile-section";
import { PeopleSection } from "./components/people-section";
import { ProductDetails } from "./components/product-details";
import { ServiceDetails } from "./components/service-details";
import { ChatDialog } from "./components/chat-dialog";
import { AddListingDialog } from "./components/add-listing-dialog";
import { Toaster } from "./components/ui/sonner";
import { StarRating } from "./components/star-rating";
import { toast } from "sonner";
import { api } from "../utils/api";

import { isLoggedIn } from "../utils/auth";
import { useChat } from "../context/ChatContext";

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("marketplace");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [addListingOpen, setAddListingOpen] = useState(false);

  const { openChat, fetchConversations, conversations } = useChat();

  const navigate = useNavigate();
  const location = useLocation();



  /* FETCH FEATURED PRODUCTS */
  const fetchFeatured = async () => {
    try {
      let filters: any = {};
      try {
        const me = await api.getMe();
        if (me.campus) {
          filters.campus = me.campus;
        }
      } catch (e) {
        // Guest user - fetch generic featured items
      }

      const data = await api.getProducts(filters);

      const enriched = (data || []).map((p: any) => {
        const ratings = p.ratings || [];
        const avg = ratings.length > 0 ? ratings.reduce((acc: any, curr: any) => acc + curr.rating, 0) / ratings.length : 0;
        return {
          ...p,
          avgRating: Math.round(avg * 10) / 10,
          reviewCount: ratings.length
        };
      });
      setFeaturedProducts(enriched.slice(0, 5));
    } catch (err) {
      console.error("Featured fetch error:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "marketplace") {
      fetchFeatured();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleRefresh = () => {
      if (activeTab === "marketplace") fetchFeatured();
    };
    window.addEventListener('listing-created', handleRefresh);
    window.addEventListener('profile-updated', handleRefresh);
    const handleOpenChat = () => setChatOpen(true);
    window.addEventListener('open-chat', handleOpenChat);

    return () => {
      window.removeEventListener('listing-created', handleRefresh);
      window.removeEventListener('profile-updated', handleRefresh);
      window.removeEventListener('open-chat', handleOpenChat);
    };
  }, [activeTab]);

  /* SYNC TAB WITH URL */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab") as TabType;
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
    const query = params.get("q");
    if (query !== null && query !== searchQuery) {
      setSearchQuery(query);
    }
  }, [location.search, activeTab, searchQuery]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    navigate(`/?tab=${tab}`);
    setSelectedCategory("all"); // Reset category on tab change
  };

  const handleStartChat = async (product: any) => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    const toastId = toast.loading("Checking for existing conversation...");
    try {
      const conv = await api.createConversation(product.user_id);
      toast.dismiss(toastId);

      // Pass the conversation object in state so Dashboard can open it immediately
      navigate(`/dashboard?tab=messages&convId=${conv.id}`, {
        state: {
          autoOpen: conv,
          productContext: {
            productTitle: product.name,
            productPrice: product.price,
            productImage: product.image_urls?.[0]
          },
          initialMessage: `Hello, I am interested in your product: ${product.name}.\n\n${product.description || "No description."}\n\nPlease share availability and price details.`,
          initialImage: product.image_urls?.[0]
        }
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to start chat.", { id: toastId });
    }
  };

  const getDefaultListingTab = () => {
    if (activeTab === "freelance") return "service";
    if (activeTab === "events") return "event";
    if (activeTab === "skill-swap") return "skill_swap";
    if (activeTab === "study-buddy") return "study_buddy";
    return "product";
  };

  const renderOtherTabs = () => {
    switch (activeTab) {
      case "freelance":
        return <FreelanceSection searchQuery={searchQuery} />;
      case "events":
        return <EventsSection searchQuery={searchQuery} />;
      case "skill-swap":
        return <SkillSwapSection />;
      case "study-buddy":
        return <StudyBuddySection />;
      case "people":
        return <PeopleSection searchQuery={searchQuery} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">

      {/* HEADER ALWAYS */}
      <Header
        onSearch={(q) => {
          setSearchQuery(q);
          // Removed forced tab switch to "people"
        }}
        onChatClick={() => navigate("/dashboard?tab=messages")}
        onAddListingClick={() => {
          if (!isLoggedIn()) {
            navigate("/login");
            return;
          }
          setAddListingOpen(true);
        }}
        onProfileClick={() => {
          if (!isLoggedIn()) {
            navigate("/login");
            return;
          }
          navigate("/profile");
        }}
      />

      {/* ROUTES */}
      <Routes>
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/service/:id" element={<ServiceDetails />} />
        {/* Profile routes are handled in main.tsx, but if we need them here as fallback */}

        {/* HOME / MARKETPLACE INDEX ROUTE */}
        {/* HOME / MARKETPLACE INDEX ROUTE */}
        <Route index element={
          <>
            {activeTab === "marketplace" ? (
              <>
                {!searchQuery && (
                  <>
                    <HeroBanner />
                    {/* CATEGORY STRIP */}
                    <div className="max-w-7xl mx-auto px-4 py-8 flex justify-center overflow-x-auto scrollbar-hide">
                      <div className="flex gap-6 md:gap-10 pb-4">
                        {[
                          { icon: "📚", label: "Notes" },
                          { icon: "🖥", label: "Electronics" },
                          { icon: "🎓", label: "Exam Prep" },
                          { icon: "🎧", label: "Accessories" },
                          { icon: "🛠", label: "Material" },
                        ].map((c) => (
                          <div
                            key={c.label}
                            onClick={() => setSelectedCategory(c.label)}
                            className="flex flex-col items-center cursor-pointer group"
                          >
                            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xl md:text-2xl transition shadow-sm ${selectedCategory === c.label ? "bg-blue-600 text-white" : "bg-white border border-slate-100 group-hover:bg-blue-50"}`}>
                              {c.icon}
                            </div>
                            <span className={`text-[10px] md:text-xs mt-2 font-bold uppercase tracking-tight ${selectedCategory === c.label ? "text-blue-600" : "text-gray-500"}`}>
                              {c.label}
                            </span>
                          </div>
                        ))}
                        {selectedCategory !== "all" && (
                          <div
                            onClick={() => setSelectedCategory("all")}
                            className="flex flex-col items-center cursor-pointer group"
                          >
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-2xl group-hover:bg-gray-200 transition">
                              ✖
                            </div>
                            <span className="text-xs mt-2 font-medium">Clear</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* FEATURED */}
                    <section className="max-w-7xl mx-auto px-4 mb-12">
                      <h2 className="text-xl font-semibold mb-4">
                        🔥 Featured on Your Campus
                      </h2>

                      <div className="flex gap-4 overflow-x-auto pb-2">
                        {featuredProducts.length > 0 ? (
                          featuredProducts.map((p) => (
                            <div
                              key={p.id}
                              className="group relative min-w-[240px] bg-white border rounded-xl
                          hover:shadow-xl transition-all duration-300 cursor-pointer"
                              onClick={() => navigate(`/product/${p.id}`)}
                            >
                              {/* IMAGE AREA */}
                              <div className="relative h-44 overflow-hidden rounded-t-xl">
                                <img
                                  src={p.image_urls?.[0] || `https://images.unsplash.com/photo-1523240715630-6d9b3294025d?q=80&w=400&auto=format&fit=crop`}
                                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                                  alt={p.name}
                                />

                                {/* HOVER OVERLAY */}
                                <div
                                  className="absolute inset-0 bg-black/40
                              flex items-center justify-center gap-3
                              opacity-0 group-hover:opacity-100
                              transition-opacity duration-300"
                                >
                                  <button className="px-3 py-1.5 text-xs font-medium rounded-md bg-white text-gray-900">
                                    View Product
                                  </button>
                                  <button
                                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartChat(p);
                                    }}
                                  >
                                    Chat
                                  </button>
                                </div>

                                {/* CONDITION BADGE */}
                                <span className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                                  {p.condition || "New"}
                                </span>
                              </div>

                              {/* CONTENT */}
                              <div className="p-4">
                                <p className="text-sm font-medium line-clamp-2">
                                  {p.name}
                                </p>
                                <p className="text-xs text-blue-600 font-bold mt-1">
                                  ₹{p.price}
                                </p>
                                {p.avgRating > 0 && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <StarRating rating={p.avgRating} size={10} />
                                    <span className="text-[10px] text-gray-400">({p.reviewCount})</span>
                                  </div>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  📍 {p.campus || "Anna University"}
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-400 py-10">No featured products yet.</div>
                        )}
                      </div>
                    </section>
                  </>
                )}

                {/* MARKETPLACE SECTION */}
                <div className="max-w-7xl mx-auto px-4 py-8">
                  <MarketplaceSection
                    searchQuery={searchQuery}
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                    onStartChat={handleStartChat}
                  />
                </div>
              </>
            ) : (
              <div className="max-w-7xl mx-auto px-4 py-8">
                {renderOtherTabs()}
              </div>
            )}
          </>
        } />
      </Routes>

      {/* GLOBAL DIALOGS */}
      <AddListingDialog
        open={addListingOpen}
        onOpenChange={setAddListingOpen}
        defaultTab={getDefaultListingTab()}
      />
      <Toaster />
    </div>
  );
}