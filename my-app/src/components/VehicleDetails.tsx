
import React from 'react';
import { Card } from '@/components/ui/card';
import { DollarSign, Gauge, MapPin } from 'lucide-react';
import type { Vehicle } from '@/types';

interface VehicleDetailsProps {
  vehicle: Vehicle;
}

const VehicleDetails = ({ vehicle }: VehicleDetailsProps) => {
  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
      <div className="text-center text-white">
        <h2 className="text-3xl font-bold mb-2">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h2>
        
        <div className="flex justify-center items-center space-x-8 mb-4">
          <div className="flex items-center text-green-400">
            <DollarSign className="w-6 h-6 mr-1" />
            <span className="text-2xl font-bold">${vehicle.price.toLocaleString()}</span>
          </div>
          
          <div className="text-white/60">•</div>
          
          <div className="text-white/80">{vehicle.color}</div>
        </div>
        
        <div className="flex justify-center items-center space-x-6 text-sm text-white/80">
          <div className="flex items-center">
            <Gauge className="w-4 h-4 mr-1" />
            <span>{vehicle.mileage} miles</span>
          </div>
          
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{vehicle.status === 'available' ? 'In Stock' : 'Sold'}</span>
          </div>
          
          <div>Stock: {vehicle.stockNumber}</div>
        </div>
      </div>
    </Card>
  );
};

export default VehicleDetails;
