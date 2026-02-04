import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Calendar, MapPin, Users, Clock, CheckCircle2, Filter, Trash2, FileText, Loader2 } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { supabase } from '../../utils/supabase';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface Event {
  id: string;
  title: string;
  category: 'symposium' | 'workshop' | 'webinar' | 'seminar' | 'cultural' | 'sports';
  date: string;
  time: string;
  location: string;
  college: string;
  participants: number;
  max_participants: number;
  fee: number;
  status: 'verified' | 'pending';
  description: string;
  image_url: string;
  organizer: string;
  user_id: string;
  official_link?: string;
}

interface EventsSectionProps {
  searchQuery?: string;
}

export function EventsSection({ searchQuery }: EventsSectionProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [feeFilter, setFeeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Edit State
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    api.getMe()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Delete this event?")) return;
    try {
      await api.deleteEvent(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
      toast.success("Event deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;
    setUpdating(true);
    try {
      const updated = await api.updateEvent(editingEvent.id, {
        title: editingEvent.title,
        description: editingEvent.description,
        date: editingEvent.date,
        time: editingEvent.time,
        location: editingEvent.location,
        fee: Number(editingEvent.fee),
        category: editingEvent.category
      });
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
      setEditingEvent(null);
      toast.success("Event updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update event");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Fetch user silently
        api.getMe().then(setCurrentUser).catch(() => setCurrentUser(null));

        const data = await api.getEvents();
        setEvents(data);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      symposium: 'bg-purple-100 text-purple-800',
      workshop: 'bg-blue-100 text-blue-800',
      webinar: 'bg-green-100 text-green-800',
      seminar: 'bg-orange-100 text-orange-800',
      cultural: 'bg-pink-100 text-pink-800',
      sports: 'bg-red-100 text-red-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  let filteredEvents = events;

  // Apply search filter
  if (searchQuery) {
    filteredEvents = filteredEvents.filter((e) =>
      (e.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.location || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Apply type filter
  if (selectedType !== 'all') {
    filteredEvents = filteredEvents.filter((e) => e.category === selectedType);
  }

  // Apply fee filter
  if (feeFilter === 'free') {
    filteredEvents = filteredEvents.filter((e) => e.fee === 0);
  } else if (feeFilter === 'paid') {
    filteredEvents = filteredEvents.filter((e) => e.fee > 0);
  }

  // Apply sorting
  filteredEvents = [...filteredEvents].sort((a, b) => {
    if (sortBy === 'participants') return (b.participants || 0) - (a.participants || 0);
    if (sortBy === 'fee-low') return (a.fee || 0) - (b.fee || 0);
    if (sortBy === 'fee-high') return (b.fee || 0) - (a.fee || 0);
    return 0;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500">Loading events...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{events.length}</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {events.filter(e => e.status === 'verified').length}
            </div>
            <div className="text-sm text-gray-600">Verified</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {events.reduce((sum, e) => sum + (e.participants || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Registrations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {events.filter(e => e.fee === 0).length}
            </div>
            <div className="text-sm text-gray-600">Free Events</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <Filter className="h-4 w-4 text-gray-600" />
          <Button
            variant={selectedType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('all')}
          >
            All Events
          </Button>
          <Button
            variant={selectedType === 'symposium' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('symposium')}
          >
            Symposiums
          </Button>
          <Button
            variant={selectedType === 'workshop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('workshop')}
          >
            Workshops
          </Button>
          <Button
            variant={selectedType === 'webinar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('webinar')}
          >
            Webinars
          </Button>
          <Button
            variant={selectedType === 'seminar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('seminar')}
          >
            Seminars
          </Button>
          <Button
            variant={selectedType === 'cultural' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('cultural')}
          >
            Cultural
          </Button>
        </div>

        <div className="flex gap-2">
          <Select value={feeFilter} onValueChange={setFeeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Fee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="free">Free Only</SelectItem>
              <SelectItem value="paid">Paid Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">By Date</SelectItem>
              <SelectItem value="participants">Most Popular</SelectItem>
              <SelectItem value="fee-low">Fee: Low-High</SelectItem>
              <SelectItem value="fee-high">Fee: High-Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
        </p>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEvents.map((event) => (
          <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <div className="relative h-48 bg-gray-100">
              <ImageWithFallback
                src={event.image_url || `https://source.unsplash.com/600x400/?campus-event`}
                alt={event.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Badge className={getTypeColor(event.category || "workshop")}>
                  {(event.category || "Event").charAt(0).toUpperCase() + (event.category || "Event").slice(1)}
                </Badge>
                {event.status === 'verified' && (
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                  {event.date}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2 text-blue-600" />
                  {event.time}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                  {event.location}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                  {event.participants || 0}/{event.max_participants || "∞"} registered
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  {event.fee === 0 ? (
                    <span className="text-xl font-bold text-green-600">Free</span>
                  ) : (
                    <div>
                      <span className="text-xl font-bold text-gray-900">₹{event.fee}</span>
                      <span className="text-sm text-gray-500 ml-1">registration</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {currentUser?.id && event.user_id === currentUser.id ? (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-gray-600"
                        onClick={() => setEditingEvent(event)}
                      >
                        <FileText className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={async () => {
                        try {
                          await api.registerForEvent(event.id);
                          // Refresh local state to show updated count
                          setEvents(prev => prev.map(e =>
                            e.id === event.id ? { ...e, participants: (e.participants || 0) + 1 } : e
                          ));

                          if (event.official_link) {
                            const url = event.official_link.startsWith('http')
                              ? event.official_link
                              : `https://${event.official_link}`;
                            window.open(url, '_blank');
                          } else {
                            toast.success("Registration logged!");
                          }
                        } catch (err: any) {
                          toast.error("Failed to register: " + err.message);
                        }
                      }}
                    >
                      Register Now
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No events found matching your filters.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSelectedType('all');
              setFeeFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingEvent && (
              <>
                <div className="space-y-2">
                  <Label>Event Title</Label>
                  <Input
                    value={editingEvent.title}
                    onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={editingEvent.date}
                      onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      value={editingEvent.time}
                      onChange={e => setEditingEvent({ ...editingEvent, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={editingEvent.category} onValueChange={v => setEditingEvent({ ...editingEvent, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="symposium">Symposium</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="webinar">Webinar</SelectItem>
                        <SelectItem value="seminar">Seminar</SelectItem>
                        <SelectItem value="cultural">Cultural</SelectItem>
                        <SelectItem value="sports">Sports</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fee (0 for Free)</Label>
                    <Input
                      type="number"
                      value={editingEvent.fee}
                      onChange={e => setEditingEvent({ ...editingEvent, fee: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={editingEvent.location}
                    onChange={e => setEditingEvent({ ...editingEvent, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingEvent.description}
                    onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEvent(null)}>Cancel</Button>
            <Button onClick={handleUpdateEvent} disabled={updating}>
              {updating ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}