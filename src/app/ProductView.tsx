import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Card, CardContent } from "./components/ui/card";
import { MapPin, ArrowLeft, ShoppingCart } from "lucide-react";

interface ProductViewProps {
  product: any;
  onBack: () => void;
}

export function ProductView({ product, onBack }: ProductViewProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Marketplace
      </Button>

      <Card>
        <CardContent className="grid md:grid-cols-2 gap-6 p-6">
          {/* Image */}
          <img
            src={`https://source.unsplash.com/600x400/?${product.image}`}
            alt={product.title}
            className="rounded-lg object-cover w-full h-80"
          />

          {/* Details */}
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{product.title}</h1>

            <div className="flex items-center text-gray-600">
              <MapPin className="h-4 w-4 mr-1" />
              {product.location}
            </div>

            <p className="text-lg font-semibold text-blue-600">
              ₹{product.price}
              {product.rentPeriod && (
                <span className="text-sm text-gray-500">
                  {" "}
                  / {product.rentPeriod}
                </span>
              )}
            </p>

            <div className="flex gap-2">
              <Badge>{product.category}</Badge>
              <Badge variant="secondary">{product.condition}</Badge>
            </div>

            <p className="text-gray-600">
              Sold by <span className="font-medium">{product.seller}</span>
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {product.type === "rent" && (
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Rent Now
                </Button>
              )}

              {(product.type === "sell" || product.type === "buy") && (
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Buy Now
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
