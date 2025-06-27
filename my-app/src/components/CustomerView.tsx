
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Car, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import MediaSlideshow from './MediaSlideshow';
import VehicleSelector from './VehicleSelector';
import type { Vehicle } from '@/types';

interface CustomerViewProps { 
  id: string;
  vehicle?: Vehicle; // Optional vehicle data passed from the parent component
  allVehicles?: Vehicle[]; // All vehicles for the selector
  sharedVehicles?: Vehicle[]; // Vehicles specifically shared in this link
}

const CustomerView: React.FC<CustomerViewProps> = ({ vehicle: providedVehicle, sharedVehicles = [], allVehicles = [] }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Update the selected vehicle when the provided vehicle changes
    if (providedVehicle) {
      setSelectedVehicle(providedVehicle);
      // Reset image index when vehicle changes
      setCurrentImageIndex(0);
    }
  }, [providedVehicle]);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(providedVehicle || null);

  const bookTestDrive = useCallback(() => {
    // In real implementation, this would integrate with Google Calendar
    alert('Test drive booking feature will integrate with Google Calendar');
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Show loading or error state if no vehicle data is available
  if (!selectedVehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-white text-3xl font-bold">Vehicle Not Found</h1>
          <p className="text-white/80 mt-2">The requested vehicle is not available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      {/* Top Section - Date, Time, and Vehicle Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Date and Time */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
          <div className="flex items-center space-x-2">
            <Clock className="text-white" />
            {hasMounted && (
              <>
                <p className="text-white">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <div className="text-white/80">{formatDate(currentTime)}</div>
              </>
            )}
          </div>
        </Card>

        {/* Vehicle Overview */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
          <div className="flex items-center space-x-2 mb-2">
            <Car className="text-white" />
            <h1 className="text-white text-xl font-bold">{selectedVehicle?.year} {selectedVehicle?.make} {selectedVehicle?.model}</h1>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/60">Price:</span>
              <p className="text-white font-semibold">${selectedVehicle?.price?.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-white/60">Mileage:</span>
              <p className="text-white font-semibold">{selectedVehicle?.mileage?.toLocaleString()} miles</p>
            </div>
            <div>
              <span className="text-white/60">Stock #:</span>
              <p className="text-white font-semibold">{selectedVehicle?.stockNumber}</p>
            </div>
            <div>
              <span className="text-white/60">VIN:</span>
              <p className="text-white font-semibold">{selectedVehicle?.vin}</p>
            </div>
            <div>
              <span className="text-white/60">Exterior Color:</span>
              <p className="text-white font-semibold">{selectedVehicle?.color}</p>
            </div>
            <div>
              <span className="text-white/60">Engine:</span>
              <p className="text-white font-semibold">{selectedVehicle?.engine}</p>
            </div>
            <div>
              <span className="text-white/60">Transmission:</span>
              <p className="text-white font-semibold">{selectedVehicle?.transmission}</p>
            </div>
            <div>
              <span className="text-white/60">Body Style:</span>
              <p className="text-white font-semibold">{selectedVehicle?.bodyStyle}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Section - Image Gallery and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image Gallery */}
        <div className="lg:col-span-2">
          <MediaSlideshow
            items={(selectedVehicle.images || []).map((image, index) => ({
              id: `image-${index}`,
              url: image,
              type: 'IMAGE',
              vehicle: selectedVehicle,
            }))}
            currentSlide={currentImageIndex}
            onSlideChange={setCurrentImageIndex}
            isPlaying={false} // Assuming no auto-play for now
            onPlaybackToggle={() => {}} // No-op for now
          />

          {/* Shared Vehicles Thumbnail Carousel */}
          {sharedVehicles.length > 1 && (
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 mb-6">
              <h3 className="text-white text-xl font-bold mb-4 flex items-center">
                <Car className="w-5 h-5 mr-2" />
                Shared Vehicles
              </h3>
              <div className="flex overflow-x-auto gap-3 pb-2">
                {sharedVehicles.map((vehicle: Vehicle) => (
                  <div 
                    key={vehicle.id} 
                    className="flex-shrink-0 cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors"
                    onClick={() => {
                      setSelectedVehicle(vehicle);
                      setCurrentImageIndex(0);
                    }}
                  >
                    <div className="relative w-32 h-24">
                      {vehicle.images?.[0] ? (
                        <Image
                          src={vehicle.images[0]}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                          <Car className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="bg-black/70 p-1">
                      <p className="text-white text-xs truncate">
                        {vehicle.year} {vehicle.make}
                      </p>
                      <p className="text-white text-xs truncate">
                        {vehicle.model}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Vehicle Selector */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-white text-xl font-bold mb-4 flex items-center">
              <Car className="w-5 h-5 mr-2" />
              Browse Inventory
            </h3>
            <div className="mb-4">
              <VehicleSelector 
                currentVehicle={selectedVehicle} 
                onVehicleSelect={(vehicle: Vehicle) => {
                  if (vehicle) {
                    setSelectedVehicle(vehicle);
                    setCurrentImageIndex(0);
                  }
                }}
                vehicles={allVehicles}
              />
            </div>
          </Card>
          
          {/* Test Drive Booking */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-white text-xl font-bold mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Schedule a Test Drive
            </h3>
            <p className="text-white/80 mb-4 text-sm">
              Experience this {selectedVehicle?.year} {selectedVehicle?.make} {selectedVehicle?.model} in person.
            </p>
            <Button 
              onClick={bookTestDrive}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Book Appointment
            </Button>
          </Card>
          
          {/* Contact Information */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-white text-xl font-bold mb-4">
              Contact Us
            </h3>
            <div className="text-white/80 space-y-2 text-sm">
              <p>Phone: (555) 123-4567</p>
              <p>Email: sales@bentleysupercenter.com</p>
              <p>Hours: Mon-Sat 9AM - 7PM</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(CustomerView);
