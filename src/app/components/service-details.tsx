import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { MapPin, ArrowLeft, Loader2, Briefcase, FileText, Trash2, X } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { api } from "../../utils/api";
import { toast } from "sonner";
import { StarRating } from "./star-rating";
import { Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function ServiceDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [service, setService] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [avgRating, setAvgRating] = useState({ average: 0, count: 0 });
    const [myRating, setMyRating] = useState<number | null>(null);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        if (location.state?.editMode) {
            setIsEditing(true);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    useEffect(() => {
        const fetchService = async () => {
            try {
                if (!id) return;

                // Fetch service first to avoid Promise.all fail on lookup
                let serviceData = null;
                try {
                    serviceData = await (api as any).getService(id);
                    setService(serviceData);
                    setEditForm({
                        title: serviceData.title,
                        category: serviceData.category,
                        price: serviceData.price,
                        unit: serviceData.unit,
                        description: serviceData.description,
                        skills: serviceData.skills ? serviceData.skills.join(', ') : ''
                    });
                } catch (err) {
                    console.error("Service fetch error:", err);
                    setService(null);
                    return;
                }

                // Fetch ratings/user
                const [ratingData, userRating, me] = await Promise.all([
                    api.getItemRating(id, 'service'),
                    api.getMyRating(id, 'service'),
                    api.getMe().catch(() => null)
                ]);

                setAvgRating(ratingData);
                setMyRating(userRating);
                setCurrentUser(me);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchService();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const handleHire = async () => {
        if (!currentUser) {
            toast.error("Please login first");
            navigate("/login");
            return;
        }

        const toastId = toast.loading("Starting chat...");
        try {
            const conv = await api.createConversation(service.user_id);
            toast.dismiss(toastId);

            navigate(`/dashboard?tab=messages&convId=${conv.id}`, {
                state: {
                    autoOpen: conv,
                    productContext: {
                        productTitle: service.title,
                        productPrice: service.price,
                        productImage: service.image_url
                    },
                    initialMessage: `Hi ${service.users?.name || 'there'},\n\nI am interested in your service "${service.title}" and would like to discuss hiring you.`
                }
            });
        } catch (err: any) {
            toast.error(err.message || "Failed to start chat", { id: toastId });
        }
    };

    const handleRate = async (newRating: number) => {
        try {
            if (!id) return;
            await api.submitRating(id, 'service', newRating);
            setMyRating(newRating);
            toast.success("Rating submitted!");
            // Refresh average
            const ratingData = await api.getItemRating(id, 'service');
            setAvgRating(ratingData);
        } catch (err: any) {
            toast.error(err.message || "Failed to submit rating");
        }
    };

    const handleUpdate = async () => {
        if (!id) return;
        setSaving(true);
        try {
            const updatedService = await api.updateService(id, {
                ...editForm,
                price: parseFloat(editForm.price),
                skills: editForm.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
            });
            // Update local state with new form values
            setService((prev: any) => ({
                ...prev,
                ...editForm,
                price: parseFloat(editForm.price),
                skills: editForm.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
            }));

            toast.success("Service updated successfully!");
            setIsEditing(false);
        } catch (err: any) {
            toast.error(err.message || "Failed to update service");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        setDeleting(true);
        try {
            await api.deleteService(id);
            toast.success("Service deleted successfully!");
            navigate('/dashboard?tab=freelance'); // Redirect to freelance list
        } catch (err: any) {
            toast.error(err.message || "Failed to delete service");
        } finally {
            setDeleting(false);
        }
    };

    if (!service) {
        return (
            <div className="p-8 text-center">
                <p className="text-lg font-semibold">Service not found</p>
                <Button className="mt-4" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-2"
            >
                <ArrowLeft className="h-4 w-4" />
                Back
            </Button>

            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <div className="p-8 md:p-12">
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <div className="h-24 w-24 rounded-full overflow-hidden shrink-0 shadow-sm border border-gray-200">
                            <ImageWithFallback
                                src={service.image_url || service.users?.avatar_url || `https://source.unsplash.com/200x200/?portrait`}
                                alt={service.users?.name}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        <div className="flex-1 space-y-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{service.title}</h1>
                                <p className="text-gray-500 font-medium">by {service.users?.name}</p>
                            </div>

                            <div className="flex flex-wrap gap-4 items-center text-gray-600">
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-bold">
                                    {service.category}
                                </span>
                                <div className="flex items-center gap-1">
                                    <MapPin size={16} className="text-gray-400" />
                                    <span className="text-sm">{service.location}</span>
                                </div>
                            </div>

                            <div className="text-4xl font-black text-slate-900">
                                ₹{service.price} <span className="text-lg text-gray-400 font-medium">/{service.unit || 'hour'}</span>
                            </div>

                            <div className="flex items-center gap-6 py-2 border-y border-gray-100">
                                <div className="flex items-center gap-2">
                                    <StarRating rating={avgRating.average} size={24} />
                                    <span className="text-lg font-bold text-gray-800">{avgRating.average}</span>
                                    <span className="text-sm text-gray-500">({avgRating.count} ratings)</span>
                                </div>
                                {currentUser && currentUser.id !== service.user_id && (
                                    <div className="border-l pl-6 space-y-1">
                                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Rate this service</p>
                                        <StarRating
                                            rating={myRating || 0}
                                            interactive={true}
                                            onRate={handleRate}
                                            size={20}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-2 underline decoration-blue-500 decoration-4 underline-offset-4">Service Description</h3>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {service.description || "No description provided."}
                                </p>
                            </div>

                            <div className="pt-8 flex gap-4">
                                {currentUser?.id === service.user_id ? (
                                    <>
                                        <Button
                                            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-lg rounded-2xl"
                                            onClick={() => setIsEditing(true)}
                                        >
                                            <FileText className="mr-2" size={20} />
                                            Edit Service
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-12 px-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-2xl border-red-100"
                                            onClick={handleDelete}
                                            disabled={deleting}
                                        >
                                            {deleting ? <Loader2 className="mr-2 animate-spin" size={20} /> : <Trash2 className="mr-2" size={20} />}
                                            Delete Service
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button
                                            className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-lg rounded-2xl"
                                            onClick={handleHire}
                                        >
                                            <Briefcase className="mr-2" size={20} />
                                            Hire Now
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-12 px-8 rounded-2xl"
                                            onClick={async () => {
                                                const toastId = toast.loading("Opening chat...");
                                                try {
                                                    const conv = await api.createConversation(service.user_id);
                                                    toast.dismiss(toastId);
                                                    navigate(`/dashboard?tab=messages&convId=${conv.id}`, {
                                                        state: {
                                                            autoOpen: conv,
                                                            productContext: {
                                                                productTitle: service.title,
                                                                productPrice: service.price,
                                                                productImage: service.image_url
                                                            }
                                                        }
                                                    });
                                                } catch (err: any) {
                                                    toast.error(err.message || "Failed to start chat", { id: toastId });
                                                }
                                            }}
                                        >
                                            Message Freelancer
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit Service</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                value={editForm.title}
                                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Price</Label>
                                <Input
                                    type="number"
                                    value={editForm.price}
                                    onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Unit</Label>
                                <Select value={editForm.unit} onValueChange={v => setEditForm({ ...editForm, unit: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Per Hour">Per Hour</SelectItem>
                                        <SelectItem value="Project">Per Project</SelectItem>
                                        <SelectItem value="Session">Per Session</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={editForm.category} onValueChange={v => setEditForm({ ...editForm, category: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
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
                            <Label>Skills (comma separated)</Label>
                            <Input
                                value={editForm.skills}
                                onChange={e => setEditForm({ ...editForm, skills: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={editForm.description}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={saving}>
                            {saving ? <Loader2 className="animate-spin h-4 w-4" /> : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
