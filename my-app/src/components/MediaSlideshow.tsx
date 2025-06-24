import Image from 'next/image';
import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import type { SlideshowItem } from '@/types';

interface MediaSlideshowProps {
  items: SlideshowItem[];
  currentSlide: number;
  onSlideChange: (index: number) => void;
  isPlaying: boolean;
  onPlaybackToggle: () => void;
}

const MediaSlideshow = ({ items, currentSlide, onSlideChange, isPlaying, onPlaybackToggle }: MediaSlideshowProps) => {
  useEffect(() => {
    if (!isPlaying || items.length <= 1) return;

    const timer = setInterval(() => {
      onSlideChange((currentSlide + 1) % items.length);
    }, 10000); // 10-second interval

    return () => clearInterval(timer);
  }, [isPlaying, items.length, currentSlide, onSlideChange]);

  const handleNext = () => {
    onSlideChange((currentSlide + 1) % items.length);
  };

  const handlePrev = () => {
    onSlideChange((currentSlide - 1 + items.length) % items.length);
  };

  if (items.length === 0) {
    return (
      <div className="relative w-full aspect-video bg-slate-800 rounded-lg flex items-center justify-center">
        <p className="text-white">No media available.</p>
      </div>
    );
  }

  const currentItem = items[currentSlide];

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
      {/* Main Image */}
      {currentItem && (
        <Image
          key={currentItem.id}
          src={currentItem.url}
          alt={currentItem.vehicle?.model || 'Custom Media'}
          layout="fill"
          objectFit="contain" // Changed from 'cover' to 'contain'
          className="transition-opacity duration-500 ease-in-out"
          priority
        />
      )}

      {/* Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />

      {/* Controls */}
      <div className="absolute top-1/2 left-4 right-4 flex justify-between items-center transform -translate-y-1/2">
        <button onClick={handlePrev} className="bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-all" aria-label="Previous slide">
          <ChevronLeft size={24} />
        </button>
        <button onClick={handleNext} className="bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-all" aria-label="Next slide">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
        {/* Vehicle Info */}
        <div className="text-white">
          {currentItem?.vehicle && (
            <>
              <h3 className="text-xl font-bold">{`${currentItem.vehicle.year} ${currentItem.vehicle.make} ${currentItem.vehicle.model}`}</h3>
              <p className="text-sm opacity-80">{`$${currentItem.vehicle.price.toLocaleString()} | ${currentItem.vehicle.mileage.toLocaleString()} miles`}</p>
            </>
          )}
        </div>

        {/* Playback and Dots */}
        <div className="flex items-center space-x-4">
          <button onClick={onPlaybackToggle} className="text-white" aria-label={isPlaying ? 'Pause slideshow' : 'Play slideshow'}>
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <div className="flex items-center space-x-2">
            {items.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => onSlideChange(index)}
                className={`w-3 h-3 rounded-full transition-all ${index === currentSlide ? 'w-6 bg-white' : 'w-3 bg-white/40'}`}
                aria-label={`Go to slide ${index + 1}`}
                title={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaSlideshow;
