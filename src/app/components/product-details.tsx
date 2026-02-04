import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { MapPin, ArrowLeft, Loader2, Heart, Star, FileText, Trash2 } from "lucide-react";
import { api } from "../../utils/api";
import { toast } from "sonner";
import { StarRating } from "./star-rating";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFav, setTogglingFav] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [avgRating, setAvgRating] = useState({ average: 0, count: 0 });
  const [myRating, setMyRating] = useState<number | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Check if we navigated here with the intent to edit
    if (location.state?.editMode) {
      setIsEditing(true);
      // Clear state so it doesn't reopen on refresh/back (optional, but good practice)
      // actually modifying history state is complex, so we'll just leave it or handle it if it becomes annoying
      window.history.replaceState({}, document.title);
    }
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        if (!id) return;
        setLoading(true);

        // Fetch user separately
        api.getMe().then(setCurrentUser).catch(() => { });

        // Fetch product first to ensure it exists
        try {
          const found = await api.getProduct(id);
          setProduct(found);
          setEditForm({
            name: found.name,
            price: found.price,
            condition: found.condition,
            category: found.category,
            campus: found.campus,
            description: found.description
          });
        } catch (err) {
          console.error("Failed to fetch product:", err);
          setProduct(null);
        }

        // Fetch favorites separately so it doesn't block the product view
        try {
          const [favorites, ratingData, userRating] = await Promise.all([
            api.getFavorites(),
            api.getItemRating(id, 'product'),
            api.getMyRating(id, 'product')
          ]);
          setIsFavorite(favorites.includes(id));
          setAvgRating(ratingData);
          setMyRating(userRating);
        } catch (err) {
          console.error("Failed to fetch ratings/favorites:", err);
        }
      } catch (err) {
        console.error("General error in ProductDetails:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleStartChat = async () => {
    const toastId = toast.loading("Opening chat...");
    try {
      const conv = await api.createConversation(product.user_id);
      toast.dismiss(toastId);
      navigate(`/dashboard?tab=messages&convId=${conv.id}`, {
        state: {
          autoOpen: conv,
          productContext: {
            productTitle: product.name,
            productPrice: product.price
          },
          initialMessage: `Hello, I am interested in your product: ${product.name}.\n\n${product.description || "No description."}\n\nPlease share availability and price details.`,
          initialImage: product.image_urls?.[0]
        }
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to start chat.", { id: toastId });
    }
  };

  const handleToggleFavorite = async () => {
    if (togglingFav) return;
    setTogglingFav(true);
    try {
      const added = await api.toggleFavorite(product.id);
      setIsFavorite(added);
      toast.success(added ? "Added to favorites" : "Removed from favorites");
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message || "Failed to update favorites");
    } finally {
      setTogglingFav(false);
    }
  };

  const handleRate = async (newRating: number) => {
    try {
      if (!id) return;
      await api.submitRating(id, 'product', newRating);
      setMyRating(newRating);
      toast.success("Rating submitted!");
      // Refresh average
      const ratingData = await api.getItemRating(id, 'product');
      setAvgRating(ratingData);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit rating");
    }
  };

  const handleUpdate = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updatedProduct = await api.updateProduct(id, {
        ...editForm,
        price: parseFloat(editForm.price)
      });
      setProduct(updatedProduct);
      toast.success("Product updated successfully!");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    setDeleting(true);
    try {
      await api.deleteProduct(product.id);
      toast.success("Product deleted successfully");
      navigate(-1);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  if (!product) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-lg font-semibold text-gray-900">Product not found</p>
        <p className="text-sm text-gray-500 italic">ID: {id}</p>
        <Button onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

      {/* BACK */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Button>

      <div className="grid md:grid-cols-2 gap-10">

        {/* IMAGES */}
        <div className="space-y-4">
          <div className="rounded-xl border overflow-hidden bg-gray-50 aspect-4/3 flex items-center justify-center">
            {product.image_urls && product.image_urls.length > 0 ? (
              <img
                src={product.image_urls[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={`https://source.unsplash.com/800x600/?${product.category}`}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          {product.image_urls && product.image_urls.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.image_urls.map((url: string, idx: number) => (
                <img
                  key={idx}
                  src={url}
                  alt="Gallery"
                  className="rounded-md border aspect-square object-cover cursor-pointer hover:opacity-80 transition"
                  onClick={() => {/* Impl main image swap if needed */ }}
                />
              ))}
            </div>
          )}
        </div>

        {/* DETAILS */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{product.name}</h1>

          <p className="text-gray-600">
            {product.condition} • {product.category}
          </p>

          <p className="text-3xl font-bold text-blue-600">
            ₹{product.price}
          </p>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <StarRating rating={avgRating.average} size={20} />
              <span className="text-sm font-medium text-gray-700">
                {avgRating.average} ({avgRating.count} reviews)
              </span>
            </div>
            {currentUser && currentUser.id !== product.user_id && (
              <div className="border-l pl-4">
                <p className="text-xs text-gray-500 mb-1">Your Rating</p>
                <StarRating
                  rating={myRating || 0}
                  interactive={true}
                  onRate={handleRate}
                  size={16}
                />
              </div>
            )}
          </div>

          <div className="flex items-center text-gray-600">
            <MapPin className="h-4 w-4 mr-1 text-gray-400" />
            {product.campus}
          </div>

          <div>
            <h3 className="font-semibold mb-1 text-gray-900">Description</h3>
            <p className="text-gray-700 leading-relaxed">{product.description || "No description provided."}</p>
          </div>

          <div className="pt-4 flex gap-3">
            {currentUser?.id === product.user_id ? (
              <>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setIsEditing(true)}
                >
                  <FileText className="mr-2" size={16} />
                  Edit Product
                </Button>
                <Button
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteProduct}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="mr-2" size={16} />}
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleStartChat}
                >
                  Chat with Seller
                </Button>

                <Button
                  variant={isFavorite ? "secondary" : "outline"}
                  className={isFavorite ? "text-red-500 hover:text-red-600" : ""}
                  disabled={togglingFav}
                  onClick={handleToggleFavorite}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isFavorite ? "fill-current" : ""}`} />
                  {isFavorite ? "Saved" : "Save Product"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
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
                <Label>Condition</Label>
                <Select value={editForm.condition} onValueChange={v => setEditForm({ ...editForm, condition: v })}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={editForm.category} onValueChange={v => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Campus</Label>
                <Input
                  value={editForm.campus}
                  onChange={e => setEditForm({ ...editForm, campus: e.target.value })}
                />
              </div>
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