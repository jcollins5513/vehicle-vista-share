"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import VehicleCard from "./VehicleCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Vehicle = {
  id: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number;
  color: string;
  images: string[];
};

export default function VehicleGrid({ vehicles }: { vehicles: Vehicle[] }) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (selectedVehicle) {
      setCurrentImageIndex(0);
    }
  }, [selectedVehicle]);

  const handleNextImage = () => {
    if (selectedVehicle) {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === selectedVehicle.images.length - 1 ? 0 : prevIndex + 1
      );
    }
  };

  const handlePrevImage = () => {
    if (selectedVehicle) {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === 0 ? selectedVehicle.images.length - 1 : prevIndex - 1
      );
    }
  };

  console.log("[VehicleGrid] Rendering with vehicles:", vehicles.length);
  console.log("[VehicleGrid] Selected vehicle:", selectedVehicle?.id);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {vehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            onClick={(v) => setSelectedVehicle(v)}
          />
        ))}
      </div>

      <Dialog open={!!selectedVehicle} onOpenChange={() => setSelectedVehicle(null)}>
        <DialogContent>
          {selectedVehicle && (
            <div className="space-y-4">
              <div className="relative w-full h-64">
                <Image
                  src={selectedVehicle.images[currentImageIndex]}
                  alt={`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover rounded-lg"
                  priority={false}
                />
                {selectedVehicle.images.length > 1 && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={handlePrevImage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={handleNextImage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-md">
                      {currentImageIndex + 1} / {selectedVehicle.images.length}
                    </div>
                  </>
                )}
              </div>
              <h2 className="text-2xl font-bold">
                {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
              </h2>
              <p className="text-xl">${selectedVehicle.price.toLocaleString()}</p>
              <div className="text-sm text-gray-500 space-y-1">
                <p>Mileage: {selectedVehicle.mileage.toLocaleString()} miles</p>
                <p>Color: {selectedVehicle.color}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
