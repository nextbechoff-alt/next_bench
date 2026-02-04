import { useState, useEffect, useRef } from "react";
import {
  Search,
  ShoppingBag,
  MessageCircle,
  User,
  Menu,
  X,
  LogOut,
  LogIn,
  LayoutDashboard,
  Heart,
  ChevronDown,
  Briefcase,
  Calendar,
  ArrowRightLeft,
  BookOpen,
  Users,
  ShoppingCart
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { isLoggedIn, logout } from "../../utils/auth";
import { api } from "../../utils/api";
import { useChat } from "../../context/ChatContext";

interface HeaderProps {
  onSearch: (query: string) => void;
  onChatClick: () => void;
  onAddListingClick: () => void;
  onProfileClick: () => void;
}

export function Header({
  onSearch,
  onChatClick,
  onAddListingClick,
  onProfileClick,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const { totalUnreadCount } = useChat();

  // Search Enhanced State
  const [searchCategory, setSearchCategory] = useState("all");
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const loggedIn = isLoggedIn();

  useEffect(() => {
    const fetchUser = () => {
      if (loggedIn) {
        api.getMe()
          .then((user: any) => setUserName(user.name))
          .catch(() => setUserName(null));
      } else {
        setUserName(null);
      }
    };

    fetchUser();
    window.addEventListener('profile-updated', fetchUser);
    return () => window.removeEventListener('profile-updated', fetchUser);
  }, [loggedIn]);

  // Handle outside click to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowCategoryMenu(false);
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const results = [];
        const users = await api.searchUsers(searchQuery);
        if (users) {
          results.push(...users.map((u: any) => ({ type: 'user', data: u })));
        }
        if (searchQuery.length > 2) {
          results.push({ type: 'category', label: `Search for "${searchQuery}" in Marketplace`, tab: 'marketplace' });
          results.push({ type: 'category', label: `Search for "${searchQuery}" in Events`, tab: 'events' });
        }
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Suggestion fetch error:", err);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounced Search for current page
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchCategory === "all" || searchCategory === "marketplace") {
        onSearch(searchQuery);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, onSearch, searchCategory]);



  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    const queryParam = encodeURIComponent(searchQuery);

    if (searchCategory !== "all") {
      navigate(`/?tab=${searchCategory}&q=${queryParam}`);
    } else {
      if (location.pathname !== '/') {
        navigate(`/?q=${queryParam}`);
      } else {
        onSearch(searchQuery);
      }
    }
  };

  const handleSuggestionClick = (s: any) => {
    setShowSuggestions(false);
    if (s.type === 'user') {
      setSearchQuery(s.data.name);
      navigate(`/?tab=people&q=${encodeURIComponent(s.data.name)}`);
      onSearch(s.data.name);
    } else if (s.type === 'category') {
      setSearchQuery(searchQuery);
      navigate(`/?tab=${s.tab}&q=${encodeURIComponent(searchQuery)}`);
      onSearch(searchQuery);
    }
  };

  const handleAuthClick = async () => {
    if (loggedIn) {
      await logout();
    } else {
      navigate("/login");
    }
  };

  const getActiveTab = () => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || "marketplace";
  };
  const activeTab = getActiveTab();

  const navItems = [
    { label: "Marketplace", sub: "Buy, Rent & Sell", icon: ShoppingCart, tab: "marketplace" },
    { label: "Freelance", sub: "Skills & Services", icon: Briefcase, tab: "freelance" },
    { label: "Events", sub: "Campus Events", icon: Calendar, tab: "events" },
    { label: "Skill Swap", sub: "Barter Skills", icon: ArrowRightLeft, tab: "skill-swap" },
    { label: "Study Buddy", sub: "Learn Together", icon: BookOpen, tab: "study-buddy" },
    { label: "People", sub: "Find Peers", icon: Users, tab: "people" },
  ];

  const categories = [
    { id: "all", label: "All" },
    { id: "marketplace", label: "Marketplace" },
    { id: "freelance", label: "Freelance" },
    { id: "events", label: "Events" },
    { id: "skill-swap", label: "Skill Swap" },
    { id: "study-buddy", label: "Study Buddy" },
    { id: "people", label: "People" },
  ];

  const currentCategoryLabel = categories.find(c => c.id === searchCategory)?.label || "All";

  return (
    <div className="flex flex-col w-full font-sans shadow-sm bg-white relative z-50">
      {/* 1. TOP BAR */}
      <div className="bg-slate-100 border-b border-slate-200 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between">
          <div className="hidden md:block font-medium">
            Welcome to NextBench campus marketplace
          </div>
          <div className="flex items-center gap-4 ml-auto">
            {loggedIn ? (
              <>
                <button onClick={onProfileClick} className="hover:text-blue-600 flex items-center gap-1 transition-colors">
                  <User size={12} /> {userName || 'My Account'}
                </button>
                <div className="h-3 w-px bg-slate-300"></div>
                <button onClick={handleAuthClick} className="hover:text-blue-600 flex items-center gap-1 transition-colors">
                  <LogOut size={12} /> Logout
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate("/login")} className="hover:text-blue-600 flex items-center gap-1 transition-colors">
                  <LogIn size={12} /> Login
                </button>
                <div className="h-3 w-px bg-slate-300"></div>
                <button onClick={() => navigate("/register")} className="hover:text-blue-600 font-semibold transition-colors">
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER */}
      <div className="bg-white py-6 border-b border-gray-100 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center gap-8">
          {/* Logo */}
          <div className="flex items-center cursor-pointer group shrink-0" onClick={() => navigate("/")}>
            <div className="bg-blue-50 p-1.5 md:p-2 rounded-xl group-hover:bg-blue-100 transition-colors">
              <ShoppingBag className="h-6 w-6 md:h-8 md:h-8 text-blue-600" />
            </div>
            <div className="ml-2 md:ml-3 flex flex-col">
              <span className="text-xl md:text-3xl font-bold text-slate-900 leading-none">NextBench</span>
              <span className="text-[8px] md:text-[10px] text-slate-500 tracking-[0.2em] font-bold mt-0.5 md:mt-1">CAMPUS MARKETPLACE</span>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 w-full max-w-2xl mx-auto relative hidden sm:block" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="flex h-12 w-full rounded-full border-2 border-blue-100 hover:border-blue-300 transition-colors bg-white shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 relative z-20 overflow-hidden">
              <div
                className="hidden sm:flex items-center px-5 text-slate-700 border-r border-slate-100 text-xs font-bold uppercase tracking-wider bg-slate-50 h-full cursor-pointer hover:bg-slate-100 transition-colors whitespace-nowrap"
                onClick={() => setShowCategoryMenu(!showCategoryMenu)}
              >
                {currentCategoryLabel} <ChevronDown className="ml-1 h-3 w-3" />
              </div>

              <input
                type="text"
                className="flex-1 px-5 text-sm text-slate-700 outline-none h-full bg-transparent"
                placeholder="Search products, services, events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="bg-blue-600 text-white h-full px-6 hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
                <Search className="h-4 w-4" /> Search
              </button>
            </form>

            {/* Move dropdown outside form to avoid overflow-hidden clipping */}
            {showCategoryMenu && (
              <div className="absolute top-[52px] left-0 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 z-[100]">
                {categories.map(c => (
                  <div key={c.id} className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer" onClick={() => { setSearchCategory(c.id); setShowCategoryMenu(false); }}>{c.label}</div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 shrink-0">
            <button onClick={() => { if (!loggedIn) return navigate("/login"); navigate("/dashboard"); }} className="flex flex-col items-center text-slate-500 hover:text-blue-600 transition-colors">
              <LayoutDashboard size={22} strokeWidth={1.5} />
              <span className="text-[10px] font-bold uppercase tracking-wide mt-1">Dashboard</span>
            </button>
            <button onClick={() => { if (!loggedIn) return navigate("/login"); onChatClick(); }} className="flex flex-col items-center text-slate-500 hover:text-blue-600 relative transition-colors">
              <MessageCircle size={22} strokeWidth={1.5} />
              <span className="text-[10px] font-bold uppercase tracking-wide mt-1">Inbox</span>
              {loggedIn && totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                  {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                </span>
              )}
            </button>
            <button onClick={() => { if (!loggedIn) return navigate("/login"); navigate("/dashboard?tab=favorites"); }} className="hidden lg:flex flex-col items-center text-slate-500 hover:text-blue-600 transition-colors">
              <Heart size={22} strokeWidth={1.5} />
              <span className="text-[10px] font-bold uppercase tracking-wide mt-1">Favs</span>
            </button>

            <Button className="hidden sm:flex bg-slate-900 hover:bg-black text-white rounded-full px-5 h-10 text-xs font-bold shadow-sm" onClick={onAddListingClick}>Post Listing</Button>
            <button className="md:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-full transition-all" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Search - Visible only on smallest screens */}
        <div className="sm:hidden px-4 pt-2 pb-0">
          <form onSubmit={handleSearchSubmit} className="flex h-10 w-full rounded-lg border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:border-blue-400 transition-all overflow-hidden">
            <input
              type="text"
              className="flex-1 px-3 text-sm bg-transparent outline-none"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="px-3 text-slate-400">
              <Search size={16} />
            </button>
          </form>
        </div>
      </div>

      {/* 3. BOTTOM BAR */}
      <div className="border-b border-gray-200 hidden md:block overflow-x-auto">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => navigate(`/?tab=${item.tab}`)}
              className={`flex items-center gap-3 py-4 px-2 group border-b-2 transition-all whitespace-nowrap ${activeTab === item.tab ? "border-blue-600" : "border-transparent hover:border-gray-300"}`}
            >
              <item.icon className={`h-5 w-5 ${activeTab === item.tab ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"}`} />
              <div className="flex flex-col items-start translate-y-[1px]">
                <span className={`text-sm font-bold leading-none ${activeTab === item.tab ? "text-blue-600" : "text-slate-700 group-hover:text-slate-900"}`}>{item.label}</span>
                <span className="text-[10px] text-slate-400 font-medium mt-1 group-hover:text-slate-500">{item.sub}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="bg-white border-t border-slate-100 p-4 space-y-4 md:hidden shadow-2xl animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start gap-2 h-11" onClick={() => navigate("/")}><ShoppingCart size={16} /> Home</Button>
            <Button variant="outline" className="justify-start gap-2 h-11" onClick={() => { if (!loggedIn) return navigate("/login"); navigate("/dashboard"); }}><LayoutDashboard size={16} /> Dashboard</Button>
            <Button variant="outline" className="justify-start gap-2 h-11" onClick={onProfileClick}><User size={16} /> Profile</Button>
            <Button variant="outline" className="justify-start gap-2 h-11 text-red-500 hover:text-red-600" onClick={handleAuthClick}><LogOut size={16} /> {loggedIn ? 'Logout' : 'Login'}</Button>
          </div>
          <div className="border-t border-slate-50 pt-4 mt-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Categories</p>
            <div className="grid grid-cols-2 gap-2">
              {navItems.map(item => (
                <div key={item.tab} onClick={() => { navigate(`/?tab=${item.tab}`); setMobileMenuOpen(false); }} className="p-3 bg-slate-50 rounded-xl flex items-center gap-3 cursor-pointer text-sm font-semibold text-slate-700 active:bg-blue-50 border border-transparent active:border-blue-100 transition-all">
                  <item.icon size={18} className="text-blue-500" /> {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
