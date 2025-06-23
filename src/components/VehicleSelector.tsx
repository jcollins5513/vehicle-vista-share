
import React from 'react';
import { Car } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Vehicle {
  id: number;
  year: number;
  make: string;
  model: string;
  price: number;
  color: string;
  miles: number;
  stock: string;
}

interface VehicleSelectorProps {
  currentVehicle: Vehicle;
  onVehicleSelect: (vehicle: Vehicle) => void;
  isCustomerView: boolean;
}

const VehicleSelector = ({ currentVehicle, onVehicleSelect, isCustomerView }: VehicleSelectorProps) => {
  // Sample vehicles - in real app, these would come from database
  const vehicles = [
    {
      id: 1,
      year: 2024,
      make: "Bentley",
      model: "Continental GT",
      price: 185500,
      color: "Beluga Black",
      miles: 450,
      stock: "BT2024001"
    },
    {
      id: 2,
      year: 2023,
      make: "Bentley",
      model: "Flying Spur",
      price: 195000,
      color: "Glacier White",
      miles: 1200,
      stock: "BT2023015"
    },
    {
      id: 3,
      year: 2024,
      make: "Bentley",
      model: "Bentayga",
      price: 165000,
      color: "Storm Grey",
      miles: 300,
      stock: "BT2024008"
    }
  ];

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
      <h4 className="text-white font-semibold mb-3 flex items-center">
        <Car className="w-4 h-4 mr-2" />
        Vehicle Selection
      </h4>
      
      {isCustomerView && (
        <p className="text-white/60 text-xs mb-3">0 vehicles selected</p>
      )}
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {vehicles.map((vehicle) => (
          <Button
            key={vehicle.id}
            onClick={() => onVehicleSelect(vehicle)}
            variant={currentVehicle.id === vehicle.id ? "default" : "outline"}
            className={`w-full text-left p-3 h-auto ${
              currentVehicle.id === vehicle.id 
                ? "bg-blue-600 text-white" 
                : "border-white/30 text-white hover:bg-white/10"
            }`}
          >
            <div className="flex flex-col items-start">
              <div className="font-medium text-sm">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </div>
              <div className="text-xs opacity-80">
                {vehicle.color} • {vehicle.miles} mi
              </div>
              <div className="text-xs font-bold">
                ${vehicle.price.toLocaleString()}
              </div>
            </div>
          </Button>
        ))}
      </div>
    </Card>
  );
};

export default VehicleSelector;
