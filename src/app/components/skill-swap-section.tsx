import { useEffect, useState } from "react";
import { api } from "../../utils/api";
import { supabase } from "../../utils/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  ArrowLeftRight,
  MessageCircle,
  Trophy,
  Clock,
  ShieldCheck,
  Trash2,
  FileText,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useChat } from "../../context/ChatContext";
import { useNavigate } from "react-router-dom";

export function SkillSwapSection() {
  const [swaps, setSwaps] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposingId, setProposingId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { openChat } = useChat();
  const navigate = useNavigate();

  // Edit State
  const [editingSwap, setEditingSwap] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    api.getMe()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  const handleProposeSwap = async (receiver: any, swapId: string) => {
    if (!currentUser) {
      toast.error("Please login to propose a swap");
      navigate("/login");
      return;
    }
    // Cannot swap with self
    if (currentUser.id === receiver.id) {
      toast.error("You cannot swap skills with yourself!");
      return;
    }

    setProposingId(swapId);
    const toastId = toast.loading("Proposing swap...");
    try {
      await api.proposeSkillSwap(swapId, receiver.id);
      toast.dismiss(toastId);
      toast.success("Proposal sent! You can chat once they accept.");

      // Refresh requests to show the sent one
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to propose swap", { id: toastId });
    } finally {
      setProposingId(null);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!requestId) {
      toast.error("Request ID is missing. Try refreshing the page.");
      return;
    }
    if (!confirm("Remove this request from your list?")) return;
    const tid = toast.loading("Deleting request...");
    try {
      await api.deleteSkillSwapRequest(requestId);
      setRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success("Request removed", { id: tid });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete request. You might not have permission.", { id: tid });
    }
  };

  const handleUpdateStatus = async (requestId: string, swapId: string, status: 'accepted' | 'declined') => {
    try {
      await api.updateSkillSwapStatus(requestId, swapId, status);
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));
      toast.success(`Request ${status}!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update request");
    }
  };

  const handleUpdateSwap = async () => {
    if (!editingSwap) return;
    setUpdating(true);
    try {
      const updated = await api.updateSkillSwap(editingSwap.id, {
        skill_offered: editingSwap.skill_offered,
        skill_wanted: editingSwap.skill_wanted,
        description: editingSwap.description
      });
      setSwaps(prev => prev.map(s => s.id === updated.id ? updated : s));
      setEditingSwap(null);
      toast.success("Swap updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update swap");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteSwap = async (swapId: string) => {
    if (!confirm("Are you sure you want to delete this swap?")) return;
    try {
      await api.deleteSkillSwap(swapId);
      setSwaps(prev => prev.filter(s => s.id !== swapId));
      toast.success("Swap deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const fetchData = async () => {
    try {
      // 1. Fetch user (silent fail for guests)
      const me = await api.getMe().catch(() => null);
      setCurrentUser(me);

      const [swapsData, incomingRequests, sentRequests] = await Promise.all([
        api.getSkillSwaps(),
        // Only fetch requests if logged in
        localStorage.getItem("token") ? api.getMySwapRequests() : Promise.resolve([]),
        localStorage.getItem("token") ? (async () => {
          const { data } = await supabase.from('skill_swap_requests').select('*, receiver:users!skill_swap_requests_receiver_id_fkey(id, name, avatar_url), swap:skill_swap(*)').eq('sender_id', me?.id);
          return data || [];
        })() : Promise.resolve([])
      ]);

      // Prioritize same campus
      const sorted = [...swapsData].sort((a: any, b: any) => {
        if (me?.campus) {
          const aSame = a.users?.campus === me.campus;
          const bSame = b.users?.campus === me.campus;
          if (aSame && !bSame) return -1;
          if (!aSame && bSame) return 1;
        }
        return 0;
      });

      setSwaps(sorted);

      // Merge and tag requests
      const allRequests = [
        ...incomingRequests.map((r: any) => ({ ...r, type: 'incoming' })),
        ...sentRequests.map((r: any) => ({ ...r, type: 'sent' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRequests(allRequests);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to REAL-TIME requests
    const channel = (supabase
      .channel('skill_swap_requests') as any)
      .on('postgres_changes', {
        event: 'INSERT',
        table: 'skill_swap_requests'
      }, async (payload: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (payload.new.receiver_id === user?.id) {
          // Refetch to get sender names etc.
          const newRequests = await api.getMySwapRequests();
          setRequests(newRequests);
          toast.info("New skill swap request received!");
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500">Loading skill swaps...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Skill Swap</h1>
          <p className="text-sm text-gray-600">
            Exchange skills with students. No money involved.
          </p>
        </div>

        <div className="flex gap-2">
          <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">
            {swaps.length} Swaps Available
          </Badge>
          <Badge variant="secondary">Recommended</Badge>
        </div>
      </div>

      {swaps.length === 0 && !loading && (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-gray-500">No skill swaps found on your campus yet.</p>
          <p className="text-sm text-gray-400 mt-1">Be the first to post a swap!</p>
        </div>
      )}

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {swaps.map((swap) => (
          <Card
            key={swap.id}
            className="relative overflow-visible transition-all hover:shadow-lg"
          >
            <CardContent className="p-6 space-y-4">
              {/* USER HEADER */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {swap.users?.name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="font-semibold">{swap.users?.name || "Anonymous"}</p>
                    <p className="text-xs text-gray-500">{swap.users?.location || "Your Campus"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-blue-600 text-sm bg-blue-50 px-2 py-1 rounded-md">
                  <ShieldCheck className="h-4 w-4" />
                  {swap.users?.trust_score || 100}%
                </div>
              </div>

              {/* OFFER / SEEK */}
              <div className="border border-blue-100 bg-white rounded-lg p-4 flex flex-col gap-4">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Has</p>
                    <p className="font-bold text-gray-900">{swap.skill_offered}</p>
                  </div>
                  <div className="bg-blue-600 rounded-full p-1 text-white">
                    <ArrowLeftRight className="h-4 w-4" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Needs</p>
                    <p className="font-bold text-gray-900">{swap.skill_wanted}</p>
                  </div>
                </div>

                {swap.description && (
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded italic">
                    "{swap.description}"
                  </p>
                )}
              </div>

              {/* META */}
              <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-50">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Barter
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  +{swap.xpReward || 50} XP
                </span>
              </div>

              {/* ACTIONS */}
              <div className="space-y-2 pt-2">
                {currentUser?.id && swap.user_id === currentUser.id ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-11 text-gray-600"
                      onClick={() => setEditingSwap(swap)}
                    >
                      <FileText className="h-4 w-4 mr-2" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 h-11 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteSwap(swap.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-semibold"
                    disabled={proposingId === swap.id}
                    onClick={() => handleProposeSwap(swap.users, swap.id)}
                  >
                    {proposingId === swap.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Propose Swap"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* REQUESTS INBOX */}
      <Card className="p-6 border-blue-100 bg-blue-50/30">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          Skill Swap Requests
          {requests.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center animate-pulse">
              {requests.length}
            </span>
          )}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Incoming swap requests from other students
        </p>

        <div className="space-y-3">
          {requests.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm italic">
              No pending requests...
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                    {(req.type === 'incoming' ? req.sender?.name : req.receiver?.name)?.[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">
                        {req.type === 'incoming' ? req.sender?.name : `Sent to ${req.receiver?.name}`}
                      </p>
                      {req.status === 'accepted' && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 flex items-center gap-1 border-0 h-5 text-[10px]">
                          <ShieldCheck size={10} /> {req.type === 'incoming' ? 'Accepted' : 'Verified'}
                        </Badge>
                      )}
                      {req.status === 'declined' && (
                        <Badge variant="outline" className="text-red-500 border-red-100 h-5 text-[10px]">Declined</Badge>
                      )}
                    </div>
                    <p className="text-xs text-blue-600 font-medium">
                      {req.swap?.skill_offered} ↔ {req.swap?.skill_wanted}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {req.type === 'incoming' && req.status === 'pending' ? (
                    <>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 h-8 px-4"
                        onClick={() => handleUpdateStatus(req.id, req.swap_id, 'accepted')}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-4"
                        onClick={() => handleUpdateStatus(req.id, req.swap_id, 'declined')}
                      >
                        Decline
                      </Button>
                    </>
                  ) : req.status === 'accepted' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-4 flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
                      onClick={async () => {
                        const toastId = toast.loading("Opening chat...");
                        try {
                          const targetId = req.type === 'incoming' ? req.sender_id : req.receiver_id;
                          const conv = await api.createConversation(targetId, "Skill Swap Discussion");
                          toast.dismiss(toastId);
                          navigate(`/dashboard?tab=messages&convId=${conv.id}`, {
                            state: {
                              autoOpen: conv,
                              productContext: {
                                productTitle: `Skill Swap: ${req.swap?.skill_offered}`,
                                productPrice: 0,
                                productImage: ""
                              }
                            }
                          });
                        } catch (err) {
                          toast.error("Failed to open chat", { id: toastId });
                        }
                      }}
                    >
                      <MessageCircle size={14} /> Chat
                    </Button>
                  ) : req.type === 'sent' && req.status === 'pending' ? (
                    <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded font-medium">Pending...</span>
                  ) : null}

                  {/* Delete Option for any completed/declined/sent request */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeleteRequest(req.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingSwap} onOpenChange={(open) => !open && setEditingSwap(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Skill Swap</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingSwap && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Skill Offered</Label>
                    <Input
                      value={editingSwap.skill_offered}
                      onChange={e => setEditingSwap({ ...editingSwap, skill_offered: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Skill Wanted</Label>
                    <Input
                      value={editingSwap.skill_wanted}
                      onChange={e => setEditingSwap({ ...editingSwap, skill_wanted: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingSwap.description}
                    onChange={e => setEditingSwap({ ...editingSwap, description: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSwap(null)}>Cancel</Button>
            <Button onClick={handleUpdateSwap} disabled={updating}>
              {updating ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
