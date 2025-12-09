
import React from 'react';
import Image from 'next/image';
import { Car } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Vehicle } from '@/types';

// Vehicle interface is now imported from @/types

interface VehicleSelectorProps {
  currentVehicle: Vehicle;
  onVehicleSelect: (vehicle: Vehicle) => void;
  vehicles?: Vehicle[]; // Optional array of vehicles to display
  multiSelect?: boolean; // Enable multi-selection mode
  selectedVehicles?: Vehicle[]; // Array of selected vehicles for sharing
  onVehicleToggle?: (vehicle: Vehicle) => void; // Toggle selection for sharing
  maxSelections?: number; // Maximum number of vehicles that can be selected
}

const VehicleSelector = ({
  currentVehicle,
  onVehicleSelect,
  vehicles = [],
  multiSelect = false,
  selectedVehicles = [],
  onVehicleToggle = () => {},
  maxSelections = 3
}: VehicleSelectorProps) => {
  // Only use provided vehicles, no fallbacks
  const displayVehicles: Vehicle[] = vehicles;


  return (
    <Card className="bg-card border-border p-4">
      <h4 className="text-foreground font-semibold mb-3 flex items-center">
        <Car className="w-4 h-4 mr-2" />
        Vehicle Selection
      </h4>
      
      {multiSelect && (
        <p className="text-muted-foreground text-xs mb-3">
          {selectedVehicles.length} of {maxSelections} vehicles selected
        </p>
      )}
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {displayVehicles.map((vehicle) => {
          const isSelected = currentVehicle.id === vehicle.id;
          const isMultiSelected = multiSelect && selectedVehicles.some(v => v.id === vehicle.id);
          return (
            <Button
              key={vehicle.id}
              onClick={() => multiSelect ? onVehicleToggle(vehicle) : onVehicleSelect(vehicle)}
              variant={isSelected || isMultiSelected ? "default" : "outline"}
              className={`w-full text-left p-3 h-auto ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isMultiSelected
                    ? "bg-accent text-accent-foreground"
                    : "border-border text-foreground hover:bg-muted"
              }`}
              disabled={multiSelect && selectedVehicles.length >= maxSelections && !isMultiSelected}
            >
              <div className="flex items-center gap-3 w-full">
                {/* Vehicle thumbnail */}
                <div className="flex-shrink-0 w-16 h-12 relative rounded-md overflow-hidden">
                  {vehicle.images && vehicle.images.length > 0 ? (
                    <Image 
                      src={vehicle.images[0]} 
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Car className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                {/* Vehicle details */}
                <div className="flex flex-col items-start flex-grow">
                  <div className="font-medium text-sm">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {vehicle.color} • {vehicle.mileage} mi
                  </div>
                  <div className="text-xs font-bold">
                    ${vehicle.price.toLocaleString()}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </Card>
  );
};

export default VehicleSelector;
