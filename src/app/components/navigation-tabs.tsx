import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Briefcase,
  Calendar,
  ArrowLeftRight,
  BookOpen,
  User,
} from "lucide-react";

export type TabType =
  | "marketplace"
  | "freelance"
  | "events"
  | "skill-swap"
  | "study-buddy"
  | "people";

interface NavigationTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function NavigationTabs({
  activeTab,
  onTabChange,
}: NavigationTabsProps) {
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  /* ---------------- SCROLL DETECTION ---------------- */
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 120) {
        setHidden(true);
      } else {
        setHidden(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const tabs = [
    {
      id: "marketplace" as TabType,
      label: "Marketplace",
      icon: ShoppingCart,
      description: "Buy, Rent & Sell",
    },
    {
      id: "freelance" as TabType,
      label: "Freelance",
      icon: Briefcase,
      description: "Skills & Services",
    },
    {
      id: "events" as TabType,
      label: "Events",
      icon: Calendar,
      description: "Campus Events",
    },
    {
      id: "skill-swap" as TabType,
      label: "Skill Swap",
      icon: ArrowLeftRight,
      description: "Barter Skills",
    },
    {
      id: "study-buddy" as TabType,
      label: "Study Buddy",
      icon: BookOpen,
      description: "Learn Together",
    },
    {
      id: "people" as TabType,
      label: "People",
      icon: User,
      description: "Find Peers",
    },
  ];

  return (
    <div
      className={`bg-white border-b border-gray-200 sticky top-16 z-40
      transition-all duration-300 ease-in-out
      ${hidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2
                transition-all whitespace-nowrap relative
                ${isActive
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  }`}
              >
                <Icon className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium text-sm">
                    {tab.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {tab.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}