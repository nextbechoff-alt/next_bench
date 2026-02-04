import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { MessageCircle, User, Loader2, MapPin, Award } from "lucide-react";
import { api } from "../../utils/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { isLoggedIn } from "../../utils/auth";
import { useChat } from "../../context/ChatContext";

interface PeopleSectionProps {
    searchQuery?: string;
}

export function PeopleSection({ searchQuery }: PeopleSectionProps) {
    const [people, setPeople] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { openChat } = useChat();

    useEffect(() => {
        const fetchPeople = async () => {
            setLoading(true);
            try {
                const me = await api.getMe().catch(() => null);
                let data: any[] = [];

                if (searchQuery) {
                    data = await api.searchUsers(searchQuery);
                } else {
                    // If no search, maybe show leaderboard or random users
                    data = await api.getLeaderboard();
                }

                // Prioritize same campus
                const sorted = [...data].sort((a: any, b: any) => {
                    if (me?.campus) {
                        const aSame = a.campus === me.campus;
                        const bSame = b.campus === me.campus;
                        if (aSame && !bSame) return -1;
                        if (!aSame && bSame) return 1;
                    }
                    return 0;
                });

                setPeople(sorted);
            } catch (error) {
                console.error("Error fetching people:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPeople();
    }, [searchQuery]);

    const handleStartChat = async (userId: string) => {
        if (!isLoggedIn()) {
            navigate("/login");
            return;
        }
        const toastId = toast.loading("Connecting...");
        try {
            const conv = await api.createConversation(userId);
            toast.dismiss(toastId);

            // Navigate to messages with conversation in state
            navigate(`/dashboard?tab=messages&convId=${conv.id}`, {
                state: { autoOpen: conv }
            });
        } catch (err: any) {
            toast.error(err.message || "Failed to start chat.", { id: toastId });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500">Searching for people...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                    {searchQuery ? `Search results for "${searchQuery}"` : "Meet your peers"}
                </h2>
                <p className="text-sm text-gray-500">
                    Connect with talented individuals across your campus
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {people.map((person) => (
                    <Card key={person.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    {person.avatar_url ? (
                                        <img
                                            src={person.avatar_url}
                                            alt={person.name}
                                            className="w-16 h-16 rounded-full object-cover border-2 border-blue-100"
                                        />
                                    ) : (
                                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                            <User className="h-8 w-8" />
                                        </div>
                                    )}
                                    {person.level > 5 && (
                                        <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1 text-white z-10">
                                            <Award className="h-3 w-3" />
                                        </div>
                                    )}
                                    {person.last_seen_at && new Date().getTime() - new Date(person.last_seen_at).getTime() < 300000 && (
                                        <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 border-2 border-white rounded-full z-10"></div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-900">{person.name}</h3>
                                    <div className="flex items-center text-xs text-gray-500 mt-1">
                                        <MapPin className="h-3 w-3 mr-1" />
                                        {person.location || "Online"}
                                    </div>
                                    <div className="flex items-center mt-2">
                                        <div className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                                            LVL {person.level || 1}
                                        </div>
                                        <div className="ml-2 text-[10px] text-gray-500">
                                            {person.xp || 0} XP
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                                <Button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 h-9 text-xs"
                                    onClick={() => handleStartChat(person.id)}
                                >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Message
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 h-9 text-xs"
                                    onClick={() => navigate(`/profile/${person.id}`)}
                                >
                                    View Profile
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {people.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
                    <p className="text-gray-500">No people found matching your search.</p>
                </div>
            )}
        </div>
    );
}
