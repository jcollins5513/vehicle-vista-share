"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  Settings,
  Monitor,
  Sparkles,
  Image as ImageIcon,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconCloud } from "@/components/magicui/icon-cloud";
import { OrbitingCircles } from "@/components/magicui/orbiting-circles";
import { Lens } from "@/components/magicui/lens";
import { getShowroomDataAction } from "@/app/actions";
import type { VehicleWithMedia } from "@/types";
import Image from "next/image";

type DisplayMode = "inventory" | "specials" | "branding" | "360";

interface SelectedVehicle {
  id: string;
  title: string;
  description: string;
  image: string;
}

export default function ShowroomDisplayPage() {
  const [vehicles, setVehicles] = useState<VehicleWithMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMode, setCurrentMode] = useState<DisplayMode>("inventory");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedVehicles, setSelectedVehicles] = useState<VehicleWithMedia[]>(
    [],
  );
  const [generatedMarketing, setGeneratedMarketing] = useState<{
    [key: string]: string;
  }>({});

  // Store logos for branding mode
  const storeLogos = [
    "/Bentley-logo-groups.svg",
    "/placeholder.svg",
    "/file.svg",
    "/globe.svg",
    "/next.svg",
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { vehicles: fetchedVehicles, error: fetchError } =
          await getShowroomDataAction();
        if (fetchError) {
          console.error("Error fetching vehicles:", fetchError);
        } else {
          setVehicles(fetchedVehicles);
        }
      } catch (e: any) {
        console.error("Error fetching data:", e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (isPlaying && currentMode === "inventory" && vehicles.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % vehicles.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, currentMode, vehicles.length]);

  const playPause = () => {
    setIsPlaying(!isPlaying);
  };

  const nextSlide = () => {
    if (currentMode === "inventory" && vehicles.length > 0) {
      setCurrentSlide((prev) => (prev + 1) % vehicles.length);
    }
  };

  const prevSlide = () => {
    if (currentMode === "inventory" && vehicles.length > 0) {
      setCurrentSlide((prev) => (prev - 1 + vehicles.length) % vehicles.length);
    }
  };

  const toggleVehicleSelection = (vehicle: VehicleWithMedia) => {
    setSelectedVehicles((prev) => {
      const exists = prev.find((v) => v.id === vehicle.id);
      if (exists) {
        return prev.filter((v) => v.id !== vehicle.id);
      } else {
        return [...prev, vehicle];
      }
    });
  };

  const generateMarketingContent = async (vehicle: VehicleWithMedia) => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Create an engaging marketing description for this vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}, ${vehicle.color}, ${vehicle.mileage} miles, priced at $${vehicle.price}. Make it compelling and highlight luxury features.`,
          vehicleId: vehicle.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedMarketing((prev) => ({
          ...prev,
          [vehicle.id]: data.message,
        }));
      }
    } catch (error) {
      console.error("Error generating marketing content:", error);
    }
  };

  const renderInventoryMode = () => {
    if (vehicles.length === 0)
      return <div className="text-white">No vehicles available</div>;

    const currentVehicle = vehicles[currentSlide];
    const image =
      currentVehicle.media?.[0]?.url ||
      currentVehicle.images?.[0] ||
      "/placeholder.svg";

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="relative max-w-4xl max-h-96 w-full h-full">
          <Image
            src={image}
            alt={`${currentVehicle.year} ${currentVehicle.make} ${currentVehicle.model}`}
            width={800}
            height={400}
            className="w-full h-full object-contain rounded-lg"
          />
          <div className="absolute bottom-4 left-4 bg-black/70 text-white p-4 rounded-lg">
            <h3 className="text-xl font-bold">
              {currentVehicle.year} {currentVehicle.make} {currentVehicle.model}
            </h3>
            <p className="text-lg">${currentVehicle.price?.toLocaleString()}</p>
            <p className="text-sm">
              {currentVehicle.mileage?.toLocaleString()} miles
            </p>
          </div>
        </div>
        <div className="absolute bottom-4 center-4 text-white text-sm">
          {currentSlide + 1} / {vehicles.length}
        </div>
      </div>
    );
  };

  const renderSpecialsMode = () => {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h3 className="text-white text-xl font-bold mb-4">
            Select Vehicles for Special Marketing
          </h3>
          <div className="grid grid-cols-3 gap-4 max-h-32 overflow-y-auto">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                onClick={() => toggleVehicleSelection(vehicle)}
                className={`cursor-pointer p-2 rounded border-2 transition-colors ${
                  selectedVehicles.find((v) => v.id === vehicle.id)
                    ? "border-blue-500 bg-blue-500/20"
                    : "border-gray-600 hover:border-gray-400"
                }`}
              >
                <Image
                  src={
                    vehicle.media?.[0]?.url ||
                    vehicle.images?.[0] ||
                    "/placeholder.svg"
                  }
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  width={100}
                  height={60}
                  className="w-full h-12 object-cover rounded mb-1"
                />
                <p className="text-white text-xs">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {selectedVehicles.map((vehicle) => (
            <Card key={vehicle.id} className="bg-gray-800 p-4">
              <div className="flex gap-4">
                <Image
                  src={
                    vehicle.media?.[0]?.url ||
                    vehicle.images?.[0] ||
                    "/placeholder.svg"
                  }
                  alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                  width={200}
                  height={120}
                  className="w-48 h-32 object-cover rounded"
                />
                <div className="flex-1">
                  <h4 className="text-white font-bold mb-2">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h4>
                  {generatedMarketing[vehicle.id] ? (
                    <p className="text-gray-300 text-sm">
                      {generatedMarketing[vehicle.id]}
                    </p>
                  ) : (
                    <Button
                      onClick={() => generateMarketingContent(vehicle)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Generate Marketing Content
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderBrandingMode = () => {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="relative w-96 h-96">
          <IconCloud images={storeLogos} />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <OrbitingCircles
              className="size-[50px] border-none bg-transparent"
              duration={20}
              radius={120}
            >
              <Image
                src="/Bentley-logo-groups.svg"
                alt="Store 1"
                width={30}
                height={30}
                className="rounded-full"
              />
            </OrbitingCircles>
            <OrbitingCircles
              className="size-[50px] border-none bg-transparent"
              duration={20}
              radius={120}
              reverse
            >
              <Image
                src="/placeholder.svg"
                alt="Store 2"
                width={30}
                height={30}
                className="rounded-full"
              />
            </OrbitingCircles>
            <OrbitingCircles
              className="size-[50px] border-none bg-transparent"
              duration={25}
              radius={160}
            >
              <Image
                src="/file.svg"
                alt="Store 3"
                width={30}
                height={30}
                className="rounded-full"
              />
            </OrbitingCircles>
            <OrbitingCircles
              className="size-[50px] border-none bg-transparent"
              duration={25}
              radius={160}
              reverse
            >
              <Image
                src="/globe.svg"
                alt="Store 4"
                width={30}
                height={30}
                className="rounded-full"
              />
            </OrbitingCircles>
            <OrbitingCircles
              className="size-[50px] border-none bg-transparent"
              duration={30}
              radius={200}
            >
              <Image
                src="/next.svg"
                alt="Store 5"
                width={30}
                height={30}
                className="rounded-full"
              />
            </OrbitingCircles>
          </div>
        </div>
      </div>
    );
  };

  const render360Mode = () => {
    const vehicles360 = vehicles.filter((v) =>
      v.media?.some((m) => m.type === "IMAGE" && m.url.includes("360")),
    );

    if (vehicles360.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-white">
          <div className="text-center">
            <RotateCcw className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p>No 360° photos available</p>
          </div>
        </div>
      );
    }

    const current360Vehicle = vehicles360[currentSlide % vehicles360.length];
    const image360 =
      current360Vehicle.media?.find((m) => m.url.includes("360"))?.url ||
      current360Vehicle.images?.[0] ||
      "/placeholder.svg";

    return (
      <div className="flex items-center justify-center h-full">
        <Lens zoomFactor={2} lensSize={200}>
          <div className="relative">
            <Image
              src={image360}
              alt={`${current360Vehicle.year} ${current360Vehicle.make} ${current360Vehicle.model} 360° View`}
              width={800}
              height={600}
              className="rounded-lg"
            />
            <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded">
              <p className="text-sm">360° Interior View</p>
              <p className="text-xs">
                {current360Vehicle.year} {current360Vehicle.make}{" "}
                {current360Vehicle.model}
              </p>
            </div>
          </div>
        </Lens>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading display...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header Controls */}
      <div className="bg-gray-900 p-4 flex items-center justify-between">
        <div className="flex space-x-4">
          <Button
            onClick={() => setCurrentMode("inventory")}
            variant={currentMode === "inventory" ? "default" : "outline"}
            className="flex items-center space-x-2"
          >
            <Monitor className="w-4 h-4" />
            <span>Inventory</span>
          </Button>
          <Button
            onClick={() => setCurrentMode("specials")}
            variant={currentMode === "specials" ? "default" : "outline"}
            className="flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Specials</span>
          </Button>
          <Button
            onClick={() => setCurrentMode("branding")}
            variant={currentMode === "branding" ? "default" : "outline"}
            className="flex items-center space-x-2"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Store Branding</span>
          </Button>
          <Button
            onClick={() => setCurrentMode("360")}
            variant={currentMode === "360" ? "default" : "outline"}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>360°</span>
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          {(currentMode === "inventory" || currentMode === "360") && (
            <>
              <Button onClick={prevSlide} size="icon" variant="outline">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button onClick={playPause} size="icon" variant="outline">
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <Button onClick={nextSlide} size="icon" variant="outline">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            onClick={() => setIsMuted(!isMuted)}
            size="icon"
            variant="outline"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="h-[calc(100vh-80px)] p-8">
        <div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden">
          {currentMode === "inventory" && renderInventoryMode()}
          {currentMode === "specials" && renderSpecialsMode()}
          {currentMode === "branding" && renderBrandingMode()}
          {currentMode === "360" && render360Mode()}
        </div>
      </div>
    </div>
  );
}
