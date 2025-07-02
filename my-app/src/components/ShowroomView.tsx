"use client";

import React, { useState, useEffect } from "react";
import { Clock, Image as ImageIcon } from "lucide-react";
import MediaSlideshow from "./MediaSlideshow";
import VehicleDetails from "./VehicleDetails";
import ShowroomTools from "./ShowroomTools";
import AppointmentCalendar from "./AppointmentCalendar";
import MediaGallery from "./MediaGallery";
import { Card } from "@/components/ui/card";
import type { VehicleWithMedia, Media, SlideshowItem } from "@/types";

interface ShowroomViewProps {
  vehicles: VehicleWithMedia[];
  customMedia: Media[];
}

const ShowroomView = ({ vehicles, customMedia = [] }: ShowroomViewProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClient, setIsClient] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<
    VehicleWithMedia | undefined
  >(vehicles.length > 0 ? vehicles[0] : undefined);
  const [slideshowItems, setSlideshowItems] = useState<SlideshowItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [vehicleCustomMedia, setVehicleCustomMedia] = useState<Media[]>([]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const stockPhotoKeywords = ["ChromeColorMatch", "RTT", "Default"];

    const vehicleImages = vehicles
      .map((vehicle): SlideshowItem | null => {
        const firstRealImage = vehicle.images.find(
          (img: string) =>
            !stockPhotoKeywords.some((keyword) => img.includes(keyword)),
        );
        if (!firstRealImage) return null;

        return {
          id: `v-${vehicle.id}`,
          url: firstRealImage,
          type: "IMAGE",
          vehicle: vehicle,
        };
      })
      .filter((item): item is SlideshowItem => item !== null);

    const customMediaItems: SlideshowItem[] = customMedia.map((media) => ({
      id: `c-${media.id}`,
      url: media.url,
      type: media.type || "IMAGE", // Use the correct property name from the Media interface
      vehicle: null,
    }));

    const allMedia = [...vehicleImages, ...customMediaItems];

    if (isClient) {
      const shuffled = [...allMedia].sort(() => Math.random() - 0.5);
      setSlideshowItems(shuffled);
    } else {
      setSlideshowItems(allMedia);
    }
  }, [vehicles, customMedia, isClient]);

  useEffect(() => {
    if (slideshowItems.length > 0 && slideshowItems[currentSlide]) {
      const currentItem = slideshowItems[currentSlide];
      // Custom media items might not have a vehicle, so we only update if it exists.
      if (currentItem.vehicle) {
        setSelectedVehicle(currentItem.vehicle);
      }
    } else if (vehicles.length > 0) {
      // Fallback to the first vehicle if slideshow is empty or item has no vehicle
      setSelectedVehicle(vehicles[0]);
    }
  }, [currentSlide, slideshowItems, vehicles]);

  // Update vehicle custom media when selected vehicle changes
  useEffect(() => {
    if (selectedVehicle) {
      // Filter custom media for the selected vehicle
      const vehicleMedia = customMedia.filter(
        (media) => media.vehicleId === selectedVehicle.id,
      );
      setVehicleCustomMedia(vehicleMedia);
    } else {
      setVehicleCustomMedia([]);
    }
  }, [selectedVehicle, customMedia]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const generateCustomerLink = (vehicleIds: string[]) => {
    if (vehicleIds.length === 0) {
      alert("Cannot generate link: No vehicles selected.");
      return;
    }
    // Restrict to single vehicle sharing
    const id = vehicleIds[0];
    const customerUrl = `${window.location.origin}/customer/${id}`;
    navigator.clipboard.writeText(customerUrl);
    alert(
      `Customer link: ${customerUrl} copied to clipboard! Only one vehicle can be shared at a time.`,
    );
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (vehicles.length === 0) {
    return (
      <div className="fixed inset-0 cosmic-gradient flex items-center justify-center">
        <div className="text-center glass-card rounded-2xl p-8">
          <h1 className="text-white text-3xl font-bold">
            Showroom is Currently Empty
          </h1>
          <p className="text-white/80 mt-2">
            Please check back later for new inventory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 cosmic-gradient overflow-auto">
      <div className="min-h-full p-4">
        {/* Top Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="glass-card rounded-2xl p-6 shadow-lg hover-lift floating">
            <h1 className="text-white text-3xl font-bold mb-2 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent text-glow">
              Bentley Supercenter
            </h1>
            <p className="text-white/90 text-lg">Premium Showroom Display</p>
          </div>

          {/* Date and Time */}
          <div className="glass-card rounded-2xl p-6 text-right shadow-lg hover-lift floating-delayed">
            <div className="flex items-center justify-end text-white mb-2">
              <Clock className="w-6 h-6 mr-3 text-purple-200 floating-slow" />
              <span className="text-xl font-mono font-bold pulse-glow">
                {isClient ? formatTime(currentTime) : "--:--:--"}
              </span>
            </div>
            <p className="text-white/90 text-sm font-medium">
              {isClient ? formatDate(currentTime) : "Loading..."}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-140px)]">
          {/* Main Display Area - 75% width */}
          <div className="lg:col-span-3 space-y-6">
            {/* Vehicle Showcase */}
            <MediaSlideshow
              items={slideshowItems}
              currentSlide={currentSlide}
              onSlideChange={setCurrentSlide}
              isPlaying={isPlaying}
              onPlaybackToggle={() => setIsPlaying(!isPlaying)}
            />

            {/* Vehicle Details */}
            {selectedVehicle && <VehicleDetails vehicle={selectedVehicle} />}

            {/* Media Gallery (conditionally rendered) */}
            {showMediaGallery && selectedVehicle && (
              <Card className="glass-card rounded-2xl p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white text-xl font-bold flex items-center">
                    <ImageIcon className="w-6 h-6 mr-3 text-purple-200" />
                    Media Gallery
                  </h3>
                  <button
                    onClick={() => setShowMediaGallery(false)}
                    className="cosmic-button px-4 py-2 rounded-xl text-white text-sm font-medium"
                  >
                    Close Gallery
                  </button>
                </div>
                <MediaGallery
                  media={vehicleCustomMedia}
                  onReorder={() => {
                    // Refresh the media list after reordering
                    // This would typically be handled by refetching from the API
                    // but for now we'll just use the existing state
                  }}
                />
              </Card>
            )}
          </div>

          {/* Right Sidebar - 25% width */}
          <div className="space-y-6">
            {/* Appointment Calendar */}
            <AppointmentCalendar />

            {/* Showroom Tools */}
            {selectedVehicle && (
              <ShowroomTools
                selectedVehicle={selectedVehicle}
                onVehicleSelect={setSelectedVehicle}
                onGenerateLink={generateCustomerLink}
                vehicles={vehicles}
                onShowMediaGallery={() => setShowMediaGallery(true)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowroomView;
