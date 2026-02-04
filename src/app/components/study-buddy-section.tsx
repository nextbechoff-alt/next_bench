import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { Loader2, BookOpen, Users, MapPin, Calendar, FileText, Download, Upload as UploadIcon, X, MessageCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

import { CAMPUSES } from '../../utils/constants';

interface StudyGroup {
  id: string;
  subject: string;
  members: number;
  maxMembers: number;
  schedule: string;
  location: string;
  topics: string[];
  organizer: string;
  college: string;
  level: string;
  nextSession: string;
  users?: { name: string; campus?: string };
}

export function StudyBuddySection() {
  const navigate = useNavigate();
  const [studyGroups, setStudyGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myMemberships, setMyMemberships] = useState<Record<string, boolean>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingMaterialsId, setViewingMaterialsId] = useState<string | null>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [groupMembers, setGroupMembers] = useState<Record<string, any[]>>({});
  const [showMembersId, setShowMembersId] = useState<string | null>(null);

  // Edit State
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    try {
      // 1. Fetch user (silent fail for guests)
      const user = await api.getMe().catch(() => null);
      setCurrentUser(user);

      // 2. Fetch groups (visible to all)
      const groups = await api.getStudyBuddies();

      setStudyGroups(groups);

      // 3. Only fetch memberships if we appear to be logged in
      if (localStorage.getItem("token")) {
        const membershipMap: Record<string, boolean> = {};
        await Promise.all(groups.map(async (g: any) => {
          try {
            const m = await api.getGroupMembership(g.id);
            membershipMap[g.id] = !!m;
          } catch (e) {
            membershipMap[g.id] = false;
          }
        }));
        setMyMemberships(membershipMap);
      } else {
        setMyMemberships({});
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleJoinLeave = async (groupId: string, isJoining: boolean) => {
    setProcessingId(groupId);
    try {
      if (isJoining) {
        await api.joinStudyGroup(groupId);
        setMyMemberships(prev => ({ ...prev, [groupId]: true }));
        toast.success("Joined group!");
      } else {
        await api.leaveStudyGroup(groupId);
        setMyMemberships(prev => ({ ...prev, [groupId]: false }));
        toast.success("Left group");
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm("Are you sure you want to delete this study group?")) return;
    try {
      await api.deleteStudyBuddy(groupId);
      toast.success("Group deleted");
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup) return;
    setUpdating(true);
    try {
      const updated = await api.updateStudyBuddy(editingGroup.id, {
        subject: editingGroup.subject,
        schedule: editingGroup.schedule,
        location: editingGroup.location,
        description: editingGroup.description,
        max_members: Number(editingGroup.max_members)
      });
      // Updating local state instead of full refetch for smoother UX
      setStudyGroups(prev => prev.map(g => g.id === updated.id ? { ...g, ...updated } : g));
      setEditingGroup(null);
      toast.success("Group updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update group");
    } finally {
      setUpdating(false);
    }
  };

  const handleKickMember = async (groupId: string, userId: string) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await api.kickGroupMember(groupId, userId);
      toast.success("Member removed");
      const members = await api.getGroupMembers(groupId);
      setGroupMembers(prev => ({ ...prev, [groupId]: members }));
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleToggleMembers = async (groupId: string) => {
    if (showMembersId === groupId) {
      setShowMembersId(null);
      return;
    }
    setShowMembersId(groupId);
    try {
      const members = await api.getGroupMembers(groupId);
      setGroupMembers(prev => ({ ...prev, [groupId]: members }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewMaterials = async (groupId: string) => {
    if (viewingMaterialsId === groupId) {
      setViewingMaterialsId(null);
      return;
    }
    setViewingMaterialsId(groupId);
    setMaterials([]);
    try {
      const data = await storage.listMaterials(`groups/${groupId}`);
      setMaterials(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (groupId: string, file: File) => {
    setUploading(true);
    try {
      const path = `groups/${groupId}/${Date.now()}_${file.name}`;
      await storage.uploadMaterial(file, path);
      toast.success("Uploaded!");
      const data = await storage.listMaterials(`groups/${groupId}`);
      setMaterials(data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMaterial = async (groupId: string, fileName: string) => {
    if (!window.confirm("Delete this file?")) return;
    try {
      await storage.deleteMaterial(`groups/${groupId}/${fileName}`);
      toast.success("Deleted!");
      const data = await storage.listMaterials(`groups/${groupId}`);
      setMaterials(data || []);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500">Loading study groups...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-8 mb-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2">📚 Study Buddy</h2>
          <p className="text-blue-100 max-w-xl">Find study partners, share resources, and ace your exams together.</p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BookOpen size={120} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {studyGroups.map((group) => (
          <Card key={group.id} className="hover:shadow-xl transition-all duration-300 border-none bg-white/50 backdrop-blur-sm shadow-sm ring-1 ring-gray-200">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-gray-900">{group.subject}</h3>
                    {currentUser?.id && group.user_id === currentUser.id && (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">Admin</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">by {group.users?.name || "Anonymous"}</p>
                </div>
                <div className="flex gap-2">
                  {currentUser?.id && group.user_id === currentUser.id && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                        onClick={() => setEditingGroup(group)}
                      >
                        <FileText size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        <X size={16} />
                      </Button>
                    </>
                  )}
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">{group.level}</Badge>
                  {currentUser?.campus && group.users?.campus === currentUser.campus && (
                    <Badge className="bg-blue-600 text-white border-transparent">
                      Your Campus
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Users size={16} className="text-blue-500" />
                  <span>{group.members || 0}/{group.max_members || 10} Members</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={16} className="text-blue-500" />
                  <span className="truncate">{group.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 col-span-2">
                  <Calendar size={16} className="text-blue-500" />
                  <span>{group.schedule}</span>
                </div>
              </div>

              {myMemberships[group.id] && (
                <div className="mb-6 space-y-3">
                  <Button
                    variant="outline"
                    className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => handleViewMaterials(group.id)}
                  >
                    {viewingMaterialsId === group.id ? "Hide Materials" : "View Materials"}
                  </Button>

                  {viewingMaterialsId === group.id && (
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <span className="text-xs font-bold text-gray-400 uppercase">Shared Files</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs font-bold text-blue-600 hover:text-blue-700 p-0"
                          disabled={uploading}
                          onClick={() => document.getElementById(`upload-${group.id}`)?.click()}
                        >
                          {uploading ? <Loader2 size={12} className="animate-spin mr-1" /> : <UploadIcon size={12} className="mr-1" />}
                          {uploading ? "Uploading..." : "Upload File"}
                        </Button>
                        <input
                          id={`upload-${group.id}`}
                          type="file"
                          hidden
                          onChange={e => e.target.files && handleUpload(group.id, e.target.files[0])}
                          disabled={uploading}
                        />
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {materials.length === 0 ? (
                          <p className="text-center py-4 text-xs text-gray-400 italic">No files shared yet.</p>
                        ) : (
                          materials.map((m, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-100 group">
                              <div className="flex items-center gap-2 truncate pr-2">
                                <FileText size={14} className="text-red-400 shrink-0" />
                                <span className="text-sm truncate font-medium text-gray-700">{m.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => window.open(storage.getPublicUrl(`groups/${group.id}/${m.name}`), '_blank')}
                                  className="p-1 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-600"
                                  title="Download"
                                >
                                  <Download size={14} />
                                </button>
                                {group.user_id === currentUser?.id && (
                                  <button
                                    onClick={() => handleDeleteMaterial(group.id, m.name)}
                                    className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                                    title="Delete File"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* MEMBERS SECTION */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs font-medium text-gray-500 hover:text-blue-600 mt-2"
                    onClick={() => handleToggleMembers(group.id)}
                  >
                    {showMembersId === group.id ? "Hide Members" : "Show Members"}
                  </Button>

                  {showMembersId === group.id && (
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {(groupMembers[group.id] || []).map((m: any) => (
                        <div key={m.user_id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-50">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                              {m.users?.name?.charAt(0) || "U"}
                            </div>
                            <span className="text-sm font-medium text-gray-700">{m.users?.name}</span>
                            {m.user_id === group.user_id && (
                              <Badge className="bg-amber-50 text-amber-600 border-none text-[10px] h-4">Host</Badge>
                            )}
                          </div>
                          {group.user_id === currentUser?.id && m.user_id !== currentUser?.id && (
                            <button
                              onClick={() => handleKickMember(group.id, m.user_id)}
                              className="text-gray-400 hover:text-red-500 p-1"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* GROUP CHAT BUTTON */}
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 border-green-200 text-green-600 hover:bg-green-50 mb-2"
                    onClick={async () => {
                      if (!group.conversation_id) {
                        toast.error("Group chat not available for this group.");
                        return;
                      }
                      const tid = toast.loading("Opening group chat...");
                      try {
                        const conv = await api.getConversation(group.conversation_id);
                        toast.dismiss(tid);
                        navigate(`/dashboard?tab=messages&convId=${conv.id}`, {
                          state: {
                            autoOpen: conv,
                            productContext: {
                              productTitle: `Group: ${group.subject}`,
                              productPrice: 0,
                              productImage: ""
                            }
                          }
                        });
                      } catch (err) {
                        toast.error("Failed to open chat", { id: tid });
                      }
                    }}
                  >
                    <MessageCircle size={16} /> Group Chat
                  </Button>
                </div>
              )}

              <Button
                onClick={() => handleJoinLeave(group.id, !myMemberships[group.id])}
                disabled={processingId === group.id}
                className={`w-full h-12 text-lg font-semibold rounded-xl ${myMemberships[group.id]
                  ? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 border-none"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200"
                  }`}
              >
                {processingId === group.id ? <Loader2 className="animate-spin" /> :
                  myMemberships[group.id] ? "Leave Group" : "Join Group"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Study Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingGroup && (
              <>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={editingGroup.subject}
                    onChange={e => setEditingGroup({ ...editingGroup, subject: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Schedule</Label>
                    <Input
                      value={editingGroup.schedule}
                      onChange={e => setEditingGroup({ ...editingGroup, schedule: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Members</Label>
                    <Input
                      type="number"
                      value={editingGroup.max_members}
                      onChange={e => setEditingGroup({ ...editingGroup, max_members: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={editingGroup.location}
                    onChange={e => setEditingGroup({ ...editingGroup, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingGroup.description}
                    onChange={e => setEditingGroup({ ...editingGroup, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Session Date & Time (for auto-expiry)</Label>
                  <Input
                    type="datetime-local"
                    value={editingGroup.session_time ? new Date(editingGroup.session_time).toISOString().slice(0, 16) : ''}
                    onChange={e => setEditingGroup({ ...editingGroup, session_time: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingGroup(null)}>Cancel</Button>
            <Button onClick={handleUpdateGroup} disabled={updating}>
              {updating ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
