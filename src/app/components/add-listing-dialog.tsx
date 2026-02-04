import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../utils/api';
import { supabase } from '../../utils/supabase';
import { X, Image as ImageIcon } from 'lucide-react';
import { useEffect } from 'react';

interface AddListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'product' | 'service' | 'event' | 'study_buddy' | 'skill_swap';
}

export function AddListingDialog({ open, onOpenChange, defaultTab = 'product' }: AddListingDialogProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    condition: 'New',
    campus: '',
    description: '',
    unit: 'Project',
    skills: '',
    schedule: '',
    location: '',
    maxMembers: '5',
    level: 'Beginner',
    type: 'Academic',
    date: '',
    time: '',
    college: '',
    fee: '0',
    maxParticipants: '100',
    organizer: '',
    skillOffered: '',
    skillWanted: '',
    official_link: '',
    session_time: '',
  });

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // AUTO-FILL CAMPUS
  useEffect(() => {
    if (open) {
      const fetchCampus = async () => {
        try {
          const me = await api.getMe();
          if (me.campus) {
            setFormData(prev => ({ ...prev, campus: me.campus }));
          }
        } catch (err) {
          console.error("Failed to fetch campus:", err);
        }
      };
      fetchCampus();
    }
  }, [open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isValid = file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024; // 5MB
      if (!isValid) toast.error(`${file.name} is too large or not an image.`);
      return isValid;
    });

    if (images.length + validFiles.length > 5) {
      toast.warning("Max 5 images allowed.");
      return;
    }

    setImages(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of images) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('marketplace')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('marketplace')
        .getPublicUrl(filePath);

      urls.push(publicUrl);
    }
    return urls;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      price: '',
      condition: 'New',
      campus: '',
      description: '',
      unit: 'Project',
      skills: '',
      schedule: '',
      location: '',
      maxMembers: '5',
      level: 'Beginner',
      type: 'Academic',
      date: '',
      time: '',
      college: '',
      fee: '0',
      maxParticipants: '100',
      organizer: '',
      skillOffered: '',
      skillWanted: '',
      official_link: '',
      session_time: '',
    });
  };

  const handleSubmit = async (type: string) => {
    setLoading(true);
    try {
      let res;
      if (type === 'product') {
        let imageUrls: string[] = [];
        if (images.length > 0) {
          imageUrls = await uploadImages();
        }
        res = await api.createProduct({
          ...formData,
          price: parseFloat(formData.price || '0'),
          image_urls: imageUrls
        });
      } else if (type === 'service') {
        let imageUrl: string | null = null;
        if (images.length > 0) {
          imageUrl = (await uploadImages())[0];
        }
        res = await api.createService({
          title: formData.name,
          category: formData.category,
          price: parseFloat(formData.price || '0'),
          description: formData.description,
          unit: formData.unit,
          skills: formData.skills.split(',').map(s => s.trim()).filter(s => s !== ''),
          image_url: imageUrl
        });
      } else if (type === 'event') {
        res = await api.createEvent({
          title: formData.name,
          category: formData.category || 'Other',
          type: formData.type,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          college: formData.college,
          max_participants: parseInt(formData.maxParticipants),
          fee: parseFloat(formData.fee || '0'),
          description: formData.description,
          organizer: formData.organizer,
          official_link: formData.official_link,
          image_url: images.length > 0 ? (await uploadImages())[0] : null
        });
      } else if (type === 'study_buddy') {
        res = await api.createStudyBuddy({
          subject: formData.name,
          topic: formData.name, // Using name as topic if separate topic field isn't explicitly filled
          college: formData.college,
          max_members: parseInt(formData.maxMembers),
          schedule: formData.schedule,
          location: formData.location,
          description: formData.description,
          level: formData.level,
          session_time: formData.session_time
        });
      } else if (type === 'skill_swap') {
        res = await api.createSkillSwap({
          skill_offered: formData.skillOffered,
          skill_wanted: formData.skillWanted,
          description: formData.description,
          category: formData.category || 'Other'
        });
      }

      if (res) {
        toast.success(`${type.replace('_', ' ')} listed successfully!`);
        resetForm();
        setImages([]);
        setPreviews([]);
        onOpenChange(false);
        // Dispatch custom event to notify components to refresh data
        window.dispatchEvent(new Event('listing-created'));
      }
    } catch (error: any) {
      console.error("CREATE ERROR:", error);
      toast.error(error.message || "Failed to create listing.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Listing</DialogTitle>
          <DialogDescription>
            Choose what type of listing you want to create and fill in the details
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto gap-2">
            <TabsTrigger value="product">Product</TabsTrigger>
            <TabsTrigger value="service">Service</TabsTrigger>
            <TabsTrigger value="event">Event</TabsTrigger>
            <TabsTrigger value="study_buddy">Study</TabsTrigger>
            <TabsTrigger value="skill_swap">Swap</TabsTrigger>
          </TabsList>

          {/* Product Listing */}
          <TabsContent value="product" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="product-title">Product Title *</Label>
              <Input
                id="product-title"
                placeholder="e.g., Engineering Mathematics"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campus *</Label>
                <Input
                  placeholder="e.g., Main Campus"
                  value={formData.campus}
                  onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Condition *</Label>
                <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Like New">Like New</SelectItem>
                    <SelectItem value="Used">Used</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Books">Books</SelectItem>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Notes">Notes</SelectItem>
                    <SelectItem value="Calculators">Calculators</SelectItem>
                    <SelectItem value="Exam Prep">Exam Prep</SelectItem>
                    <SelectItem value="Material">Material</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price (₹) *</Label>
                <Input
                  type="number"
                  placeholder="250"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>

            {/* IMAGE UPLOAD */}
            <div className="space-y-2">
              <Label>Product Images (Max 5, up to 5MB each)</Label>
              <div className="grid grid-cols-5 gap-2">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative aspect-square border rounded-md overflow-hidden group">
                    <img src={src} className="w-full h-full object-cover" alt="Preview" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {previews.length < 5 && (
                  <label className="aspect-square border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <span className="text-[10px] text-gray-500 mt-1">Add Image</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => handleSubmit('product')} disabled={loading} className="bg-blue-600 min-w-[120px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Listing"}
              </Button>
            </div>
          </TabsContent>

          {/* Service Listing */}
          <TabsContent value="service" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Service Title *</Label>
              <Input
                placeholder="e.g., Web Design"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select onValueChange={v => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IT & Tech">IT & Tech</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Writing">Writing</SelectItem>
                    <SelectItem value="Tutoring">Tutoring</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pricing Unit</Label>
                <Select value={formData.unit} onValueChange={v => setFormData({ ...formData, unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Per Hour">Per Hour</SelectItem>
                    <SelectItem value="Project">Per Project</SelectItem>
                    <SelectItem value="Session">Per Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Skills (comma separated)</Label>
                <Input
                  placeholder="React, Python, Figma"
                  value={formData.skills}
                  onChange={e => setFormData({ ...formData, skills: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Starting Price (₹)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Detail your service..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* IMAGE UPLOAD FOR SERVICE */}
            <div className="space-y-2">
              <Label>Service Image (Max 1, up to 5MB)</Label>
              <div className="grid grid-cols-5 gap-2">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative aspect-square border rounded-md overflow-hidden group">
                    <img src={src} className="w-full h-full object-cover" alt="Preview" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {previews.length < 1 && (
                  <label className="aspect-square border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <span className="text-[10px] text-gray-500 mt-1">Add Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => handleSubmit('service')} disabled={loading} className="bg-blue-600 min-w-[120px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Listing"}
              </Button>
            </div>
          </TabsContent>

          {/* Event Listing */}
          <TabsContent value="event" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Event Title *</Label>
              <Input
                placeholder="e.g., Workshop on AI"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select onValueChange={v => setFormData({ ...formData, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Cultural">Cultural</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Hackathon">Hackathon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Workshop">Workshop</SelectItem>
                    <SelectItem value="Seminar">Seminar</SelectItem>
                    <SelectItem value="Competition">Competition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fee (₹)</Label>
                <Input
                  type="number"
                  value={formData.fee}
                  onChange={e => setFormData({ ...formData, fee: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Participants</Label>
                <Input
                  type="number"
                  value={formData.maxParticipants}
                  onChange={e => setFormData({ ...formData, maxParticipants: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>College</Label>
                <Input
                  placeholder="e.g., IIT Delhi"
                  value={formData.college}
                  onChange={e => setFormData({ ...formData, college: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  placeholder="e.g., Hall A or Online"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Details of the event..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Official Website Link</Label>
              <Input
                placeholder="https://event-website.com"
                value={formData.official_link}
                onChange={e => setFormData({ ...formData, official_link: e.target.value })}
              />
            </div>

            {/* IMAGE UPLOAD FOR EVENT */}
            <div className="space-y-2">
              <Label>Event Poster (Max 1, up to 5MB)</Label>
              <div className="grid grid-cols-5 gap-2">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative aspect-square border rounded-md overflow-hidden group">
                    <img src={src} className="w-full h-full object-cover" alt="Preview" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {previews.length < 1 && (
                  <label className="aspect-square border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <span className="text-[10px] text-gray-500 mt-1">Add Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => handleSubmit('event')} disabled={loading} className="bg-blue-600 min-w-[120px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Event"}
              </Button>
            </div>
          </TabsContent>

          {/* Study Group Listing */}
          <TabsContent value="study_buddy" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Subject/Topic *</Label>
              <Input
                placeholder="e.g., Data Structures"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Max Members</Label>
                <Input
                  type="number"
                  value={formData.maxMembers}
                  onChange={e => setFormData({ ...formData, maxMembers: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={formData.level} onValueChange={v => setFormData({ ...formData, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>College</Label>
              <Input
                placeholder="e.g., MIT"
                value={formData.college}
                onChange={e => setFormData({ ...formData, college: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Schedule</Label>
              <Input
                placeholder="e.g., Mon 5 PM"
                value={formData.schedule}
                onChange={e => setFormData({ ...formData, schedule: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Session Date & Time (for auto-expiry) *</Label>
              <Input
                type="datetime-local"
                value={formData.session_time}
                onChange={e => setFormData({ ...formData, session_time: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => handleSubmit('study_buddy')} disabled={loading} className="bg-blue-600 min-w-[120px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Group"}
              </Button>
            </div>
          </TabsContent>

          {/* Skill Swap Listing */}
          <TabsContent value="skill_swap" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Skill You Have *</Label>
                <Input
                  placeholder="e.g., Python"
                  value={formData.skillOffered}
                  onChange={e => setFormData({ ...formData, skillOffered: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Skill You Need *</Label>
                <Input
                  placeholder="e.g., UI/UX"
                  value={formData.skillWanted}
                  onChange={e => setFormData({ ...formData, skillWanted: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tech">Technical</SelectItem>
                  <SelectItem value="Language">Language</SelectItem>
                  <SelectItem value="Arts">Creative Arts</SelectItem>
                  <SelectItem value="Academics">Academics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Briefly describe what you want to learn/teach..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={() => handleSubmit('skill_swap')} disabled={loading} className="bg-blue-600 min-w-[120px]">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post Swap Request"}
              </Button>
            </div>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
