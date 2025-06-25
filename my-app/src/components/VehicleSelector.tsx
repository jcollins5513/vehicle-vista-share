
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
    <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
      <h4 className="text-white font-semibold mb-3 flex items-center">
        <Car className="w-4 h-4 mr-2" />
        Vehicle Selection
      </h4>
      
      {multiSelect && (
        <p className="text-white/60 text-xs mb-3">
          {selectedVehicles.length} of {maxSelections} vehicles selected
        </p>
      )}
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {displayVehicles.map((vehicle) => (
          <Button
            key={vehicle.id}
            onClick={() => multiSelect ? onVehicleToggle(vehicle) : onVehicleSelect(vehicle)}
            variant={currentVehicle.id === vehicle.id || (multiSelect && selectedVehicles.some(v => v.id === vehicle.id)) ? "default" : "outline"}
            className={`w-full text-left p-3 h-auto ${
              currentVehicle.id === vehicle.id 
                ? "bg-blue-600 text-white" 
                : multiSelect && selectedVehicles.some(v => v.id === vehicle.id)
                  ? "bg-green-600 text-white"
                  : "border-white/30 text-white hover:bg-white/10"
            }`}
            disabled={multiSelect && selectedVehicles.length >= maxSelections && !selectedVehicles.some(v => v.id === vehicle.id)}
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
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <Car className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Vehicle details */}
              <div className="flex flex-col items-start flex-grow">
                <div className="font-medium text-sm">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </div>
                <div className="text-xs opacity-80">
                  {vehicle.color} • {vehicle.mileage} mi
                </div>
                <div className="text-xs font-bold">
                  ${vehicle.price.toLocaleString()}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </Card>
  );
};

export default VehicleSelector;
