
import React, { useState, useEffect } from 'react';
import { Play, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Vehicle {
  id: string;
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number;
  features: string[];
  images: string[];
  color: string;
  trim?: string;
  engine?: string;
  transmission?: string;
  description: string;
  sourceUrl?: string;
  facebookPostId?: string;
  lastFacebookPostDate?: Date;
  lastMarketplacePostDate?: Date;
  carfaxHighlights?: any;
  bodyStyle?: string;
  vehicleClass?: string;
  status: 'available' | 'sold';
  createdAt: Date;
  updatedAt: Date;
}

interface MediaSlideshowProps {
  vehicle: Vehicle;
}

const MediaSlideshow = ({ vehicle }: MediaSlideshowProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Use vehicle images from database if available, otherwise fallback to sample images
  const mediaItems = vehicle.images.length > 0 
    ? vehicle.images.map((url, index) => ({
        type: 'image',
        url,
        caption: `View ${index + 1}`
      }))
    : [
        {
          type: 'image',
          url: '/lovable-uploads/62f13105-748e-495f-8d8e-507a1df71f4e.png',
          caption: 'Exterior View'
        },
        {
          type: 'image',
          url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800',
          caption: 'Interior Dashboard'
        },
        {
          type: 'image', 
          url: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800',
          caption: 'Side Profile'
        }
      ];

  const totalSlides = mediaItems.length;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && totalSlides > 1) {
      interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalSlides]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20 overflow-hidden">
      <div className="relative aspect-video bg-black">
        {mediaItems[currentSlide] && (
          <>
            <img 
              src={mediaItems[currentSlide].url}
              alt={mediaItems[currentSlide].caption}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay Controls */}
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevSlide}
                  className="bg-black/50 text-white hover:bg-black/70"
                >
                  <SkipBack className="w-6 h-6" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlayback}
                  className="bg-black/50 text-white hover:bg-black/70"
                >
                  <Play className="w-8 h-8" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextSlide}
                  className="bg-black/50 text-white hover:bg-black/70"
                >
                  <SkipForward className="w-6 h-6" />
                </Button>
              </div>
            </div>

            {/* Bottom Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <h3 className="text-white text-2xl font-bold mb-2">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h3>
              <p className="text-white/80">{mediaItems[currentSlide].caption}</p>
              
              {/* Progress Indicators */}
              <div className="flex space-x-2 mt-4">
                {mediaItems.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-1 rounded transition-all ${
                      index === currentSlide ? 'bg-white' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Slide Counter */}
            <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded text-sm">
              {currentSlide + 1}/{totalSlides} media
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default MediaSlideshow;
