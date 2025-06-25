
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Car, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
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

  const handleNextImage = () => {
    if (selectedVehicle?.images && selectedVehicle.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % selectedVehicle.images.length);
    }
  };

  const handlePrevImage = () => {
    if (selectedVehicle?.images && selectedVehicle.images.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + selectedVehicle.images.length) % selectedVehicle.images.length);
    }
  };

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
              <span className="ml-2 text-green-400 font-bold">
                ${selectedVehicle.price.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-white/60">Color:</span>
              <span className="ml-2">{selectedVehicle.color}</span>
            </div>
            <div>
              <span className="text-white/60">Mileage:</span>
              <span className="ml-2">{selectedVehicle.mileage} mi</span>
            </div>
            <div>
              <span className="text-white/60">Stock:</span>
              <span className="ml-2">{selectedVehicle.stockNumber}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Vehicle Display */}
        <div className="lg:col-span-3 space-y-6">
          {/* Main Vehicle Image Slideshow */}
          <div className="relative w-full h-64 md:h-96 lg:h-[500px] my-6 rounded-lg overflow-hidden bg-black/30">
            {selectedVehicle?.images && selectedVehicle.images.length > 0 ? (
              <>
                {/* Current Image */}
                <Image
                  src={selectedVehicle.images[currentImageIndex]}
                  alt={`${selectedVehicle?.year || ''} ${selectedVehicle?.make || ''} ${selectedVehicle?.model || ''}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 100vw"
                  className="object-contain"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
                
                {/* Navigation Controls */}
                {selectedVehicle.images.length > 1 && (
                  <div className="absolute top-1/2 left-4 right-4 flex justify-between items-center transform -translate-y-1/2">
                    <button 
                      onClick={handlePrevImage} 
                      className="bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-all"
                      aria-label="Previous image"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button 
                      onClick={handleNextImage} 
                      className="bg-black/50 text-white p-2 rounded-full hover:bg-black/80 transition-all"
                      aria-label="Next image"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </div>
                )}
                
                {/* Image Counter */}
                {selectedVehicle.images.length > 1 && (
                  <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {(currentImageIndex as number) + 1} / {selectedVehicle.images.length}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                  <Car className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No images available for this vehicle</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Vehicle Specifications */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-white text-xl font-bold mb-4 flex items-center">
              <Car className="w-6 h-6 mr-2" />
              Performance & Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {selectedVehicle?.engine && (
                  <div className="text-white">
                    <span className="text-white/60">Engine:</span>
                    <span className="ml-2">{selectedVehicle.engine}</span>
                  </div>
                )}
                {selectedVehicle?.transmission && (
                  <div className="text-white">
                    <span className="text-white/60">Transmission:</span>
                    <span className="ml-2">{selectedVehicle.transmission}</span>
                  </div>
                )}
                <div className="text-white">
                  <span className="text-white/60">Status:</span>
                  <span className="ml-2 capitalize">{selectedVehicle.status}</span>
                </div>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-3">Key Features</h4>
                <ul className="space-y-2">
                  {selectedVehicle?.features?.map((feature, index) => (
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
                isCustomerView={true}
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
