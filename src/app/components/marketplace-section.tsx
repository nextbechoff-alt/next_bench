import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Heart, MapPin, Filter, Loader2, Star, FileText, X } from "lucide-react";
import { StarRating } from "./star-rating";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { api } from "../../utils/api";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

/* ---------------- TYPES ---------------- */
interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  condition: string;
  campus: string;
  image_urls: string[];
  description: string;
  user_id: string;
}

interface MarketplaceSectionProps {
  searchQuery?: string;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onStartChat: (product: Product) => void;
}

/* ======================================================= */

export function MarketplaceSection({
  searchQuery,
  selectedCategory,
  onCategoryChange,
  onStartChat,
}: MarketplaceSectionProps) {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* FETCH PRODUCTS & FAVORITES */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [prodData, favIds, user] = await Promise.all([
          api.getProducts({
            category: selectedCategory,
            search: searchQuery
          }),
          api.getFavorites(),
          api.getMe().catch(() => null)
        ]);

        setProducts(prodData);
        setFavoriteIds(new Set(favIds as string[]));
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    const handleRefresh = () => fetchData();
    window.addEventListener('listing-created', handleRefresh);
    return () => window.removeEventListener('listing-created', handleRefresh);
  }, [selectedCategory, searchQuery]);

  /* TOGGLE FAVORITE */
  const toggleFavorite = async (product: Product) => {
    try {
      const isAdded = await api.toggleFavorite(product.id);
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (isAdded) next.add(product.id);
        else next.delete(product.id);
        return next;
      });
      toast.success(isAdded ? "Added to favorites" : "Removed from favorites");
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure?")) return;
    setDeletingId(id);
    try {
      await api.deleteProduct(id);
      toast.success("Product deleted");
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  /* FILTER LOGIC */
  let filteredProducts = [...products];

  filteredProducts.sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    return 0;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="mt-4 text-gray-500">Loading products...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* FILTERS */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="bg-slate-100 p-1.5 rounded-lg flex items-center justify-center shrink-0">
          <Filter className="h-4 w-4 text-gray-600" />
        </div>

        {["all", "Books", "Notes", "Calculators", "Material", "Electronics", "Exam Prep"].map((c) => (
          <Button
            key={c}
            size="sm"
            variant={selectedCategory === c ? "default" : "outline"}
            onClick={() => onCategoryChange(c)}
            className="shrink-0 rounded-full text-xs h-8 px-4"
          >
            {c === "all" ? "All" : c}
          </Button>
        ))}

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Newest" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-low">Price: Low–High</SelectItem>
            <SelectItem value="price-high">Price: High–Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-gray-600">
        Showing {filteredProducts.length} results
      </p>

      {/* PRODUCT GRID */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl border shadow-sm hover:shadow-md transition overflow-hidden flex flex-col"
            >
              {/* IMAGE */}
              <div className="relative h-44">
                <ImageWithFallback
                  src={product.image_urls?.[0] || `https://source.unsplash.com/600x400/?${product.category}`}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <button
                  className={`absolute top-2 right-2 p-1.5 rounded-full shadow-sm transition ${favoriteIds.has(product.id)
                    ? "bg-red-50 text-red-500"
                    : "bg-white text-gray-400 hover:text-red-500"
                    }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(product);
                  }}
                >
                  <Heart
                    className={`h-4 w-4 ${favoriteIds.has(product.id) ? "fill-current" : ""
                      }`}
                  />
                </button>
                {currentUser?.campus && product.campus === currentUser.campus && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    Your Campus
                  </div>
                )}
              </div>

              {/* CONTENT */}
              <div className="p-4 flex-1">
                <h3 className="font-semibold line-clamp-2">
                  {product.name}
                </h3>

                <p className="text-xs text-gray-500">
                  {product.condition} • {product.category}
                </p>

                <div className="flex items-center justify-between mt-1">
                  <p className="font-bold text-blue-600">
                    ₹{product.price}
                  </p>
                  {(product as any).ratings?.length > 0 && (
                    <div className="flex items-center gap-1">
                      <StarRating
                        rating={(product as any).ratings.reduce((acc: any, curr: any) => acc + curr.rating, 0) / (product as any).ratings.length}
                        size={12}
                      />
                      <span className="text-[10px] font-medium text-gray-400">
                        ({(product as any).ratings.length})
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center text-sm text-gray-600 mt-2">
                  <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                  {product.campus || "Unknown Campus"}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 px-3 pb-3">
                {currentUser?.id && product.user_id === currentUser.id ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs text-gray-600"
                      onClick={() => navigate(`/product/${product.id}`, { state: { editMode: true } })}
                    >
                      <FileText className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(product.id)}
                      disabled={deletingId === product.id}
                    >
                      {deletingId === product.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
                      Delete
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      View product
                    </Button>

                    <Button
                      onClick={() => onStartChat(product)}
                    >
                      Chat
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed">
          <p className="text-gray-500">No products found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}