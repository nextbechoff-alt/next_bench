import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
    rating: number;
    onRate?: (rating: number) => void;
    interactive?: boolean;
    size?: number;
}

export function StarRating({ rating, onRate, interactive = false, size = 18 }: StarRatingProps) {
    const [hover, setHover] = useState(0);

    return (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    disabled={!interactive}
                    className={`${interactive ? 'cursor-pointer' : 'cursor-default transition-transform hover:scale-110 active:scale-95'}`}
                    onMouseEnter={() => interactive && setHover(star)}
                    onMouseLeave={() => interactive && setHover(0)}
                    onClick={() => interactive && onRate?.(star)}
                >
                    <Star
                        size={size}
                        className={`${star <= (hover || rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            } transition-colors`}
                    />
                </button>
            ))}
        </div>
    );
}
