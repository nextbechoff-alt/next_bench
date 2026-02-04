import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Star, MapPin, Briefcase, Filter, FileText, X, Loader2 } from 'lucide-react';
import { StarRating } from './star-rating';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

interface FreelanceService {
  id: string;
  name: string;
  title: string;
  skills: string[];
  rating: number;
  reviews: number;
  hourlyRate: number;
  location: string;
  description: string;
  image: string;
  category: string;
}

// Mock data removed

interface FreelanceSectionProps {
  searchQuery?: string;
}

export function FreelanceSection({ searchQuery }: FreelanceSectionProps) {
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [hiringId, setHiringId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleHire = async (service: any) => {
    if (!currentUser) {
      toast.error("Please login to hire freelancers");
      navigate("/login");
      return;
    }

    // Optimistic check to prevent chatting with self
    if (currentUser.id === service.user_id) {
      toast.error("You cannot hire yourself!");
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
            productImage: service.image_url || service.users?.avatar_url
          },
          initialMessage: `Hi ${service.users?.name || 'there'},\n\nI am interested in your service "${service.title}" and would like to discuss a project.\n\nPlease let me know your availability.`
        }
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to start chat", { id: toastId });
    }
  };

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const [data, user] = await Promise.all([
          api.getServices(),
          api.getMe().catch(() => null)
        ]);
        setCurrentUser(user);
        const sorted = data.map((s: any) => {
          const ratings = s.ratings || [];
          const avg = ratings.length > 0 ? ratings.reduce((acc: any, curr: any) => acc + curr.rating, 0) / ratings.length : 0;
          return {
            ...s,
            avgRating: Math.round(avg * 10) / 10,
            reviewCount: ratings.length
          };
        }).sort((a, b) => {
          if (user?.campus) {
            const aSame = a.users?.campus === user.campus;
            const bSame = b.users?.campus === user.campus;
            if (aSame && !bSame) return -1;
            if (!aSame && bSame) return 1;
          }
          return 0;
        });
        setServices(sorted);
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();

    const handleRefresh = () => fetchServices();
    window.addEventListener('listing-created', handleRefresh);
    return () => window.removeEventListener('listing-created', handleRefresh);
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    setDeletingId(id);
    try {
      await api.deleteService(id);
      toast.success("Listing deleted");
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  let filteredServices = services;

  // Apply search filter
  if (searchQuery) {
    filteredServices = filteredServices.filter((s: any) =>
      s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.skills || []).some((skill: string) => skill.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Apply category filter
  if (selectedCategory !== 'all') {
    filteredServices = filteredServices.filter((s) => s.category === selectedCategory);
  }

  // Apply price range filter
  if (priceRange !== 'all') {
    if (priceRange === 'low') {
      filteredServices = filteredServices.filter((s) => s.hourlyRate < 250);
    } else if (priceRange === 'medium') {
      filteredServices = filteredServices.filter((s) => s.hourlyRate >= 250 && s.hourlyRate <= 350);
    } else if (priceRange === 'high') {
      filteredServices = filteredServices.filter((s) => s.hourlyRate > 350);
    }
  }

  // Apply sorting
  filteredServices = [...filteredServices].sort((a, b) => {
    if (sortBy === 'rating') return (b.avgRating || 0) - (a.avgRating || 0);
    if (sortBy === 'price-low') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price-high') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'reviews') return (b.reviewCount || 0) - (a.reviewCount || 0);
    return 0;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500">Loading freelancers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">


      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <Filter className="h-4 w-4 text-gray-600" />
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Button>
          <Button
            variant={selectedCategory === 'Development' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('Development')}
          >
            Development
          </Button>
          <Button
            variant={selectedCategory === 'Design' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('Design')}
          >
            Design
          </Button>
          <Button
            variant={selectedCategory === 'Writing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('Writing')}
          >
            Writing
          </Button>
          <Button
            variant={selectedCategory === 'Video' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('Video')}
          >
            Video
          </Button>
          <Button
            variant={selectedCategory === 'Marketing' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('Marketing')}
          >
            Marketing
          </Button>
        </div>

        <div className="flex gap-2">
          <Select value={priceRange} onValueChange={setPriceRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Price Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prices</SelectItem>
              <SelectItem value="low">Under ₹250</SelectItem>
              <SelectItem value="medium">₹250-350</SelectItem>
              <SelectItem value="high">Above ₹350</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="reviews">Most Reviews</SelectItem>
              <SelectItem value="price-low">Price: Low-High</SelectItem>
              <SelectItem value="price-high">Price: High-Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredServices.length} {filteredServices.length === 1 ? 'freelancer' : 'freelancers'}
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredServices.map((service) => (
          <Card key={service.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shadow-sm">
                    <ImageWithFallback
                      src={service.image_url || service.users?.avatar_url || `https://source.unsplash.com/200x200/?portrait,profile`}
                      alt={service.users?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{service.users?.name || "Unknown"}</h3>
                      <p
                        className="text-sm text-blue-600 hover:underline cursor-pointer font-medium"
                        onClick={() => navigate(`/service/${service.id}`)}
                      >
                        {service.title}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <StarRating rating={service.avgRating} size={14} />
                      <span className="ml-1 text-sm font-medium text-gray-700">{service.avgRating || 0}</span>
                      <span className="ml-1 text-xs text-gray-500">({service.reviewCount || 0})</span>
                    </div>
                  </div>

                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <MapPin className="h-3 w-3 mr-1" />
                    {service.location}
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{service.description}</p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {(service.skills || []).map((skill: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xl font-bold text-gray-900">₹{service.price || 0}</span>
                      <span className="text-sm text-gray-500">/hour</span>
                    </div>
                    <div className="flex gap-2">
                      {currentUser?.id && service.user_id === currentUser.id ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-gray-600"
                            onClick={() => navigate(`/service/${service.id}`, { state: { editMode: true } })}
                          >
                            <FileText className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(service.id)}
                            disabled={deletingId === service.id}
                          >
                            {deletingId === service.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                            Delete
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/service/${service.id}`)}
                          >
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => handleHire(service)}
                          >
                            <Briefcase className="h-4 w-4 mr-1" /> Hire
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No freelancers found matching your filters.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setSelectedCategory('all');
              setPriceRange('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
} 