"use client";

import React, { useState, useEffect } from 'react';
import { VehicleWithMedia, SlideshowItem } from "@/types";
import MediaSlideshow from './MediaSlideshow';
import ShowroomTools from './ShowroomTools';

interface IntegratedShowroomProps {
  vehicles: VehicleWithMedia[];
  initialVehicleId?: string;
}

const IntegratedShowroom = ({ vehicles, initialVehicleId }: IntegratedShowroomProps) => {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithMedia | null>(null);
  const [slideshowItems, setSlideshowItems] = useState<SlideshowItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (vehicles.length > 0) {
      const initialVehicle = vehicles.find(v => v.id === initialVehicleId) || vehicles[0];
      setSelectedVehicle(initialVehicle);
    }
  }, [vehicles, initialVehicleId]);

  useEffect(() => {
    if (selectedVehicle) {
      // Combine scraped images and uploaded media into a single slideshow list
      const scrapedImages: SlideshowItem[] = selectedVehicle.images.map((url, index) => ({
        id: `scraped-${selectedVehicle.id}-${index}`,
        url,
        vehicle: selectedVehicle,
        type: 'IMAGE',
      }));

      const customMediaItems: SlideshowItem[] = (selectedVehicle.media?.map((m) => ({
        id: `c-${m.id}`,
        url: m.url,
        type: m.type,
        vehicle: selectedVehicle,
      })) ?? []);

      const allItems = [...scrapedImages, ...customMediaItems];
      setSlideshowItems(allItems);
      setCurrentSlide(0); // Reset slide index when vehicle changes
    }
  }, [selectedVehicle]);

  const handleVehicleSelect = (vehicle: VehicleWithMedia) => {
    setSelectedVehicle(vehicle);
  };

  const handleGenerateLink = (vehicleIds: string[]) => {
    const url = `/customer-view?vehicles=${vehicleIds.join(',')}`;
    // In a real app, you might want to copy this to the clipboard
    alert(`Shareable link generated: ${window.location.origin}${url}`);
  };

  if (!selectedVehicle) {
    return <div className="text-white">Loading vehicles...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white p-4 gap-4">
      {/* Left Column: Media Slideshow */}
      <div className="w-2/3">
        <MediaSlideshow
          items={slideshowItems}
          currentSlide={currentSlide}
          onSlideChange={setCurrentSlide}
          isPlaying={isPlaying}
          onPlaybackToggle={() => setIsPlaying(!isPlaying)}
        />
      </div>

      {/* Right Column: Showroom Tools */}
      <div className="w-1/3">
        <ShowroomTools
          selectedVehicle={selectedVehicle}
          onVehicleSelect={handleVehicleSelect}
          onGenerateLink={handleGenerateLink}
          vehicles={vehicles}
        />
      </div>
    </div>
  );
};

export default IntegratedShowroom;
