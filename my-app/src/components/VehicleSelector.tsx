
import React from 'react';
import { Car } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Vehicle {
  id: string;
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage: number;
  features: string[];
  images: string[];
  color: string;
  trim?: string;
  engine?: string;
  transmission?: string;
  description: string;
  sourceUrl?: string;
  facebookPostId?: string;
  lastFacebookPostDate?: Date;
  lastMarketplacePostDate?: Date;
  carfaxHighlights?: any;
  bodyStyle?: string;
  vehicleClass?: string;
  status: 'available' | 'sold';
  createdAt: Date;
  updatedAt: Date;
}

interface VehicleSelectorProps {
  currentVehicle: Vehicle;
  onVehicleSelect: (vehicle: Vehicle) => void;
  isCustomerView: boolean;
}

const VehicleSelector = ({ currentVehicle, onVehicleSelect, isCustomerView }: VehicleSelectorProps) => {
  // Sample vehicles - in real app, these would come from database
  const vehicles: Vehicle[] = [
    {
      id: "1",
      stockNumber: "BT2024001",
      vin: "SCBCP7ZA1KC123456",
      year: 2024,
      make: "Bentley",
      model: "Continental GT",
      price: 185500,
      color: "Beluga Black",
      mileage: 450,
      features: ["Premium Leather", "Adaptive Cruise Control"],
      images: [],
      description: "Luxury grand tourer",
      status: "available" as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "2",
      stockNumber: "BT2023015",
      vin: "SCBCP7ZA2KC123457",
      year: 2023,
      make: "Bentley",
      model: "Flying Spur",
      price: 195000,
      color: "Glacier White",
      mileage: 1200,
      features: ["Premium Leather", "Bang & Olufsen Sound"],
      images: [],
      description: "Luxury sedan",
      status: "available" as const,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: "3",
      stockNumber: "BT2024008",
      vin: "SCBCP7ZA3KC123458",
      year: 2024,
      make: "Bentley",
      model: "Bentayga",
      price: 165000,
      color: "Storm Grey",
      mileage: 300,
      features: ["Premium Leather", "360° Camera System"],
      images: [],
      description: "Luxury SUV",
      status: "available" as const,
      createdAt: new Date(),
      updatedAt: new Date()
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
                {vehicle.color} • {vehicle.mileage} mi
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
