import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Header } from "./components/header";
import { ProfileSection } from "./components/profile-section";
import { ChatDialog } from "./components/chat-dialog"; // ✅ MISSING IMPORT

export default function ProfilePage() {
  const navigate = useNavigate();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Header
        onSearch={() => { }}
        onChatClick={() => setChatOpen(true)} // ✅ Messages now works
        onAddListingClick={() => navigate("/dashboard")}
        onProfileClick={() => navigate("/profile")}
      />

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-8">
        <ProfileSection onBack={() => navigate(-1)} />
      </div>

      {/* CHAT DIALOG */}
      <ChatDialog open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}