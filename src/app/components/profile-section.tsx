import { useState, useEffect } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { api } from "../../utils/api";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { supabase } from "../../utils/supabase";
import { Progress } from "./ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./ui/dialog";
import {
  Camera,
  Edit,
  Save,
  X,
  Trophy,
  Coins,
  TrendingUp,
  MapPin,
  Loader2,
  User as UserIcon,
  ShoppingBag,
  Plus,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { CAMPUSES } from "../../utils/constants";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "./ui/utils";

/* ---------------- TOOLTIP ---------------- */
function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative group ml-1 cursor-pointer">
      <span className="text-xs text-gray-400">ⓘ</span>
      <span
        className="absolute left-1/2 -translate-x-1/2 mt-2 w-56
        bg-black text-white text-xs rounded px-2 py-1
        opacity-0 group-hover:opacity-100 transition z-20"
      >
        {text}
      </span>
    </span>
  );
}

/* ======================================================= */

interface ProfileSectionProps {
  onBack?: () => void;
}

export function ProfileSection({ onBack }: ProfileSectionProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"products" | "services" | "gamification">(
    "products"
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campusPopoverOpen, setCampusPopoverOpen] = useState(false);

  /* ---------------- USER STATE ---------------- */
  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [form, setForm] = useState<any>({
    name: "",
    bio: "",
    location: "",
    avatar: "",
    campus: ""
  });
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [userServices, setUserServices] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);


  /* FETCH DATA */
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const me = await api.getMe();
        setCurrentUser(me);

        let targetUser = me;
        let isPublicView = false;

        if (id && id !== me.id) {
          targetUser = await api.getUser(id);
          isPublicView = true;
        }

        setIsPublic(isPublicView);
        setUser(targetUser);
        setForm({
          name: targetUser.name,
          bio: targetUser.bio || "Student at NextBench",
          location: targetUser.location || "Campus",
          avatar: targetUser.avatar_url,
          campus: targetUser.campus || ""
        });

        const [prods, servs] = await Promise.all([
          isPublicView ? api.getProducts() : api.getMyProducts(),
          isPublicView ? api.getServices() : api.getMyServices(),
        ]);

        // Filter products/services for public view if needed
        const filteredProds = isPublicView ? prods.filter((p: any) => p.user_id === id) : prods;
        const filteredServs = isPublicView ? servs.filter((s: any) => s.user_id === id) : servs;

        setUserProducts(filteredProds);
        setUserServices(filteredServs);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
        setLoadingItems(false);
      }
    };

    fetchAll();
  }, [id]);

  const uploadAvatar = async (blobUrl: string): Promise<string> => {
    if (!blobUrl.startsWith('blob:')) return blobUrl;

    const response = await fetch(blobUrl);
    const blob = await response.blob();
    const fileExt = blob.type.split('/')[1] || 'jpg';
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('marketplace')
      .upload(filePath, blob);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('marketplace')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const saveProfile = async () => {
    console.log("saveProfile called. Current form state:", form);
    setSaving(true);
    const toastId = toast.loading("Saving profile...");
    try {
      if (!form.campus) {
        console.warn("Save aborted: Campus is missing");
        toast.warning("Please select a campus!", { id: toastId });
        setSaving(false);
        return;
      }

      let finalAvatar = form.avatar;
      if (form.avatar?.startsWith('blob:')) {
        try {
          finalAvatar = await uploadAvatar(form.avatar);

        } catch (uploadErr: any) {
          console.error("Avatar upload failed:", uploadErr);
          toast.error("Failed to upload image. Please try again.", { id: toastId });
          setSaving(false);
          return;
        }
      }

      const updated = await api.updateProfile({
        name: form.name,
        bio: form.bio,
        location: form.location,
        avatar_url: finalAvatar,
        campus: form.campus
      });

      setUser(updated);
      setCurrentUser(updated); // Sync global user state
      setForm({
        name: updated.name,
        bio: updated.bio || "Student at NextBench",
        location: updated.location || "Campus",
        avatar: updated.avatar_url,
        campus: updated.campus || ""
      });
      setIsEditing(false);
      toast.success("Profile updated!", { id: toastId });
      window.dispatchEvent(new Event('profile-updated'));
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      toast.error(err.message || "Save failed.", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  /* cleanup blob image */
  useEffect(() => {
    return () => {
      if (form.avatar?.startsWith("blob:")) {
        URL.revokeObjectURL(form.avatar);
      }
    };
  }, [form.avatar]);

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-gray-500">Loading profile...</p>
      </div>
    );
  }

  const userGamification = {
    level: user.level || 1,
    xp: user.xp || 0,
    xpMax: 1000,
    coins: user.coins || 0,
    trust: user.trust_score || 100,
    streak: 7,
    rank: 4,
  };

  const xpPercent = (userGamification.xp / userGamification.xpMax) * 100;

  /* ---------------- DYNAMIC DATA ---------------- */
  const products = userProducts.map(p => ({ title: p.name, price: `₹${p.price}`, id: p.id, image_url: p.image_urls?.[0] }));
  const services = userServices.map(s => ({ title: s.title || s.name, price: `₹${s.price}${s.unit ? '/' + s.unit : ''}`, id: s.id }));

  const tabs = [
    { id: "products", label: "Products", icon: <Coins size={16} /> },
    { id: "services", label: "Services", icon: <TrendingUp size={16} /> },
    { id: "gamification", label: "Gamification", icon: <Trophy size={16} /> },
  ] as const;

  /* ======================================================= */

  return (
    <div className="max-w-6xl mx-auto px-4">

      {/* BACK BUTTON */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back
        </button>
      )}

      {/* ================= PROFILE HEADER ================= */}
      <Card className="relative overflow-hidden mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50" />
        <div className="relative p-6 flex flex-col md:flex-row gap-6 items-start">

          {/* AVATAR */}
          <div className="relative">
            <Avatar className="w-28 h-28 ring-4 ring-white shadow-lg">
              <AvatarImage src={form.avatar} />
              <AvatarFallback>AJ</AvatarFallback>
            </Avatar>

            {isEditing && (
              <label className="absolute -bottom-2 -right-2 bg-blue-600 p-2 rounded-full cursor-pointer">
                <Camera className="h-4 w-4 text-white" />
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setForm((prev: any) => ({
                        ...prev,
                        avatar: URL.createObjectURL(file),
                      }));
                    }
                  }}
                />
              </label>
            )}
          </div>

          {/* DETAILS */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-gray-500">@{user.email?.split('@')[0]}</p>
            <p className="mt-2 text-gray-700">{user.bio}</p>

            <div className="flex flex-col gap-1 mt-3">
              <p className="flex items-center gap-1 text-sm font-medium text-blue-600">
                <ShoppingBag size={14} /> {user.campus || "No Campus Selected"}
              </p>
              <p className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin size={14} /> {user.location}
              </p>
            </div>

            <div className="flex gap-2 mt-3">
              <Badge>Top Seller</Badge>
              <Badge variant="secondary">Verified Student</Badge>
              <Badge variant="secondary">Quick Responder</Badge>
            </div>

            {/* ACTIONS */}
            <div className="mt-4">
              {!isPublic ? (
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild>
                    <Button variant="outline" type="button">
                      <Edit size={16} className="mr-2" /> Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>
                        Make changes to your profile here. Click save when you're done.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="flex justify-center">
                        <div className="relative">
                          <Avatar className="w-20 h-20 ring-2 ring-blue-100">
                            <AvatarImage src={form.avatar} />
                            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <label className="absolute -bottom-1 -right-1 bg-blue-600 p-1.5 rounded-full cursor-pointer shadow-lg hover:bg-blue-700 transition">
                            <Camera className="h-3 w-3 text-white" />
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setForm((prev: any) => ({
                                    ...prev,
                                    avatar: URL.createObjectURL(file),
                                  }));
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Full Name</label>
                        <Input
                          placeholder="Full Name"
                          value={form.name}
                          onChange={(e) =>
                            setForm((prev: any) => ({ ...prev, name: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Bio</label>
                        <Textarea
                          placeholder="Short bio..."
                          value={form.bio}
                          onChange={(e) =>
                            setForm((prev: any) => ({ ...prev, bio: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">My Campus (Mandatory)</label>
                        <Select
                          value={form.campus}
                          onValueChange={(value) => {
                            console.log("Campus selected via Select:", value);
                            setForm((prev: any) => ({ ...prev, campus: value }));
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select your campus..." />
                          </SelectTrigger>
                          <SelectContent className="z-[101] max-h-[300px]">
                            {CAMPUSES.map((campus) => (
                              <SelectItem key={campus} value={campus}>
                                {campus}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500">Specific Location</label>
                        <Input
                          placeholder="Specific location (e.g., Hostel 4)"
                          value={form.location}
                          onChange={(e) =>
                            setForm((prev: any) => ({ ...prev, location: e.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" type="button" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveProfile} disabled={saving} type="button">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save size={16} className="mr-2" />}
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="flex gap-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    type="button"
                    onClick={async () => {
                      const toastId = toast.loading("Opening chat...");
                      try {
                        const conv = await api.createConversation(user.id);
                        toast.dismiss(toastId);
                        navigate(`/dashboard?tab=messages&convId=${conv.id}`, {
                          state: { autoOpen: conv }
                        });
                      } catch (err: any) {
                        toast.error(err.message || "Failed to start chat.", { id: toastId });
                      }
                    }}
                  >
                    Chat with {user.name.split(' ')[0]}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ================= TABS ================= */}
      <div className="flex gap-3 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm transition
              ${tab === t.id
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
              }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ================= PRODUCTS ================= */}
      {tab === "products" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {loadingItems ? (
            <div className="col-span-full text-center py-10 text-gray-400">Loading your products...</div>
          ) : products.length > 0 ? (
            products.map((p, idx) => (
              <Card
                key={p.id || idx}
                className="hover:shadow-md transition cursor-pointer group"
                onClick={() => navigate(`/product/${p.id}`)}
              >
                <div className="h-32 bg-gray-100 flex items-center justify-center text-gray-300 relative overflow-hidden">
                  <ImageWithFallback src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">View Details</span>
                  </div>
                </div>
                <CardContent className="p-3">
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-blue-600 font-bold">{p.price}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-10 text-gray-400">You haven't listed any products yet.</div>
          )}
        </div>
      )}

      {/* ================= SERVICES ================= */}
      {tab === "services" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {loadingItems ? (
            <div className="col-span-full text-center py-10 text-gray-400">Loading your services...</div>
          ) : services.length > 0 ? (
            services.map((s, idx) => (
              <Card
                key={s.id || idx}
                className="hover:shadow-md transition cursor-pointer group"
                onClick={() => navigate(`/service/${s.id}`)}
              >
                <CardContent className="p-4 relative">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">Details</span>
                  </div>
                  <p className="font-bold text-lg truncate mb-1 group-hover:text-blue-600 transition-colors">{s.title}</p>
                  <p className="text-slate-600 font-medium">{s.price}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-10 text-gray-400">You haven't listed any services yet.</div>
          )}
        </div>
      )}

      {/* ================= GAMIFICATION ================= */}
      {tab === "gamification" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-white">
            <h4 className="font-medium flex items-center gap-1">
              Progress & Reputation
              <Tooltip text="Based on activity, ratings and consistency." />
            </h4>

            <Progress value={xpPercent} className="h-2 mt-3" />

            <p className="text-xs text-gray-500 mt-1">
              Level {userGamification.level} ·{" "}
              {userGamification.xp}/{userGamification.xpMax} XP
            </p>

            <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
              <span>🔥 Streak: {userGamification.streak} days</span>
              <span>⭐ Trust: {userGamification.trust}%</span>
              <span>🪙 Coins: {userGamification.coins}</span>
              <span>🏆 Rank: #{userGamification.rank}</span>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-medium flex items-center gap-1">
              Earn XP & Redeem
              <Tooltip text="Earn XP by participating and grow visibility." />
            </h4>

            <ul className="text-sm mt-3 space-y-1">
              <li>Create listing <b>+40 XP</b></li>
              <li>Complete sale <b>+120 XP</b></li>
              <li>5★ rating <b>+30 XP</b></li>
            </ul>

            <div className="mt-4 space-y-2">
              <Button className="w-full bg-blue-100 border border-blue-200 text-blue-700 hover:bg-blue-200">
                🚀 Boost Listing (200 coins)
              </Button>

              <Button className="w-full bg-blue-100 border border-blue-200 text-blue-700 hover:bg-blue-200">
                ✨ Highlight Profile (300 coins)
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-medium flex items-center gap-1">
              Campus Leaderboard
              <Tooltip text="Your rank among campus peers." />
            </h4>

            <ul className="mt-3 text-sm space-y-2">
              <li>🥇 Arjun M. – 5420 XP</li>
              <li>🥈 Priya K. – 4890 XP</li>
              <li className="font-medium bg-blue-100 border border-blue-200 text-blue-700 p-2 rounded">
                ⭐ You – 2450 XP
              </li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
