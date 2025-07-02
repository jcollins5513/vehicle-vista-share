import Image from "next/image";
import React, { useEffect } from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import type { SlideshowItem } from "@/types";

interface MediaSlideshowProps {
  items: SlideshowItem[];
  currentSlide: number;
  onSlideChange: (index: number) => void;
  isPlaying: boolean;
  onPlaybackToggle: () => void;
}

const MediaSlideshow = ({
  items,
  currentSlide,
  onSlideChange,
  isPlaying,
  onPlaybackToggle,
}: MediaSlideshowProps) => {
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
      <div className="relative w-full aspect-video cosmic-slideshow rounded-3xl flex items-center justify-center">
        <p className="text-white text-lg font-medium">No media available.</p>
      </div>
    );
  }

  const currentItem = items[currentSlide];

  return (
    <div className="relative w-full aspect-video cosmic-slideshow rounded-3xl overflow-hidden shadow-2xl">
      {/* Main Image */}
      {currentItem && (
        <Image
          key={currentItem.id}
          src={currentItem.url}
          alt={currentItem.vehicle?.model || "Custom Media"}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: "contain" }}
          className="transition-opacity duration-500 ease-in-out"
          priority
        />
      )}

      {/* Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/90 via-purple-900/30 to-transparent" />

      {/* Controls */}
      <div className="absolute top-1/2 left-6 right-6 flex justify-between items-center transform -translate-y-1/2">
        <button
          onClick={handlePrev}
          className="cosmic-button text-white p-3 rounded-full shadow-lg"
          aria-label="Previous slide"
        >
          <ChevronLeft size={28} />
        </button>
        <button
          onClick={handleNext}
          className="cosmic-button text-white p-3 rounded-full shadow-lg"
          aria-label="Next slide"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
        {/* Vehicle Info */}
        <div className="glass-card-dark rounded-2xl p-4 max-w-md">
          {currentItem?.vehicle && (
            <>
              <h3 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                {`${currentItem.vehicle.year || ""} ${currentItem.vehicle.make || ""} ${currentItem.vehicle.model || ""}`.trim()}
              </h3>
              <p className="text-lg text-white/90 font-medium">
                {currentItem.vehicle.price !== undefined &&
                  `$${currentItem.vehicle.price.toLocaleString()}`}
                {currentItem.vehicle.price !== undefined &&
                  currentItem.vehicle.mileage !== undefined &&
                  " | "}
                {currentItem.vehicle.mileage !== undefined &&
                  `${currentItem.vehicle.mileage.toLocaleString()} miles`}
              </p>
            </>
          )}
        </div>

        {/* Playback and Dots */}
        <div className="flex items-center space-x-6">
          <button
            onClick={onPlaybackToggle}
            className="cosmic-button p-3 rounded-full text-white shadow-lg"
            aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <div className="flex items-center space-x-3">
            {items.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => onSlideChange(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? "w-8 h-4 bg-gradient-to-r from-purple-400 to-pink-400"
                    : "w-4 h-4 bg-white/50 hover:bg-white/70"
                }`}
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
