"use client";

import React, { useState, useEffect } from "react";
import ExpandableCard from "./ExpandableCard";

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

export default function ExpandableCardGrid({ vehicles }: { vehicles: Vehicle[] }) {
  console.log('[ExpandableCardGrid] Initial render with vehicles:', vehicles);

  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    console.log('[ExpandableCardGrid] Component mounted');
    return () => console.log('[ExpandableCardGrid] Component unmounted');
  }, []);

  useEffect(() => {
    console.log('[ExpandableCardGrid] Active vehicle changed:', activeVehicle);
  }, [activeVehicle]);

  const handleActivate = (vehicle: Vehicle) => {
    console.log('[ExpandableCardGrid] handleActivate called with vehicle:', {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model
    });
    setActiveVehicle(vehicle);
  };

  const handleClose = () => {
    console.log('[ExpandableCardGrid] handleClose called');
    setActiveVehicle(null);
  };

  console.log('[ExpandableCardGrid] Rendering with activeVehicle:', activeVehicle?.id);

  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4"
      onClick={(e) => console.log('[ExpandableCardGrid] Grid clicked:', e.target)}
    >
      {vehicles.map((vehicle) => {
        const isActive = activeVehicle?.id === vehicle.id;
        console.log(`[ExpandableCardGrid] Rendering vehicle ${vehicle.id}, isActive:`, isActive);
        
        return (
          <ExpandableCard
            key={vehicle.id}
            vehicle={vehicle}
            isActive={isActive}
            onActivate={() => {
              console.log('[ExpandableCardGrid] Card clicked:', vehicle.id);
              handleActivate(vehicle);
            }}
            onClose={handleClose}
          />
        );
      })}
    </div>
  );
}
