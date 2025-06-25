
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Car, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import MediaSlideshow from '@/app/components/MediaSlideshow';
import VehicleSelector from '@/app/components/VehicleSelector';

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

interface CustomerViewProps {
  vehicle: Vehicle;
  allVehicles: Vehicle[];
}

export default function CustomerView({ vehicle, allVehicles }: CustomerViewProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>(vehicle);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update selectedVehicle if the vehicle prop changes
  useEffect(() => {
    setSelectedVehicle(vehicle);
  }, [vehicle]);

  // Set up time update interval
  useEffect(() => {
    // Only update the time if the component is still mounted
    let mounted = true;
    
    const updateTime = () => {
      if (mounted) {
        setCurrentTime(new Date());
      }
    };
    
    const timer = setInterval(updateTime, 1000);
    
    // Cleanup function to clear interval and set mounted to false
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const bookTestDrive = () => {
    // In real implementation, this would integrate with Google Calendar
    alert('Test drive booking feature will integrate with Google Calendar');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      {/* Header with Date and Time */}
      <div className="mb-6">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 max-w-md">
          <div className="flex items-center text-white">
            <Clock className="w-5 h-5 mr-3" />
            <div>
              <div className="text-xl font-mono font-bold">{formatTime(currentTime)}</div>
              <div className="text-white/80 text-sm">{formatDate(currentTime)}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Media Slideshow */}
          <div className="relative">
            <Suspense fallback={<div>Loading slideshow...</div>}>
              <MediaSlideshow vehicle={selectedVehicle} />
            </Suspense>
            
            {/* Vehicle Info - Static below slideshow */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4 -mt-2">
              <h2 className="text-2xl font-bold text-white mb-2">
                {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-white/60">Price:</span>
                  <span className="ml-2 text-green-400 font-bold block">
                    ${selectedVehicle.price.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-white/60">Mileage:</span>
                  <span className="ml-2 block">{selectedVehicle.mileage.toLocaleString()} mi</span>
                </div>
                <div>
                  <span className="text-white/60">Stock #:</span>
                  <span className="ml-2 block">{selectedVehicle.stockNumber}</span>
                </div>
                <div>
                  <span className="text-white/60">Status:</span>
                  <span className="ml-2 capitalize">{selectedVehicle.status}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Vehicle Specifications */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-white text-xl font-bold mb-4 flex items-center">
              <Car className="w-6 h-6 mr-2" />
              Performance & Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {selectedVehicle.engine && (
                  <div className="text-white">
                    <span className="text-white/60">Engine:</span>
                    <span className="ml-2">{selectedVehicle.engine}</span>
                  </div>
                )}
                {selectedVehicle.transmission && (
                  <div className="text-white">
                    <span className="text-white/60">Transmission:</span>
                    <span className="ml-2">{selectedVehicle.transmission}</span>
                  </div>
                )}
                {selectedVehicle.color && (
                  <div className="text-white">
                    <span className="text-white/60">Color:</span>
                    <span className="ml-2 capitalize">{selectedVehicle.color.toLowerCase()}</span>
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-white font-semibold mb-3">Key Features</h4>
                <ul className="space-y-2">
                  {selectedVehicle.features.map((feature, index) => (
                    <li key={index} className="text-white/80 text-sm">
                      • {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Dealership Information */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-white text-xl font-bold mb-3">Bentley SuperCenter</h3>
            <div className="space-y-2 text-white/90">
              <p>2755 University Dr.</p>
              <p>Huntsville, AL 35806</p>
              <p className="mt-3">
                <a href="tel:2569215525" className="hover:text-white transition-colors">
                  (256) 921-5525
                </a>
              </p>
            </div>
          </Card>

          {/* Book Test Drive */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-white text-lg font-bold mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Book Test Drive
            </h3>
            <Button 
              onClick={bookTestDrive}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Schedule Appointment
            </Button>
          </Card>

          {/* Vehicle Selection */}
          <VehicleSelector 
            currentVehicle={selectedVehicle}
            onVehicleSelect={setSelectedVehicle}
            isCustomerView={true}
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(CustomerView);
