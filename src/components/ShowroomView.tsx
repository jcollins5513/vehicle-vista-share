
import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import MediaSlideshow from './MediaSlideshow';
import VehicleDetails from './VehicleDetails';
import ShowroomTools from './ShowroomTools';
import AppointmentCalendar from './AppointmentCalendar';

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

const ShowroomView = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle>({
    id: "1",
    stockNumber: "BT2024001",
    vin: "SCBCP7ZA1KC123456",
    year: 2024,
    make: "Bentley",
    model: "Continental GT",
    price: 185500,
    color: "Beluga Black",
    mileage: 450,
    features: ["Premium Leather Interior", "Adaptive Cruise Control", "360° Camera System"],
    images: [],
    engine: "3.0L Twin-Turbo V6",
    transmission: "8-Speed Automatic",
    description: "Luxury grand tourer with exceptional performance",
    status: "available" as const,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const generateCustomerLink = () => {
    const customerUrl = `${window.location.origin}/customer/${selectedVehicle.id}`;
    navigator.clipboard.writeText(customerUrl);
    // In real implementation, this would generate a secure link
    alert('Customer link copied to clipboard!');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
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
      {/* Top Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <h1 className="text-white text-2xl font-bold mb-2">Bentley Supercenter</h1>
          <p className="text-white/80">Showroom Display</p>
        </div>
        
        {/* Date and Time */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 text-right">
          <div className="flex items-center justify-end text-white mb-2">
            <Clock className="w-5 h-5 mr-2" />
            <span className="text-lg font-mono">{formatTime(currentTime)}</span>
          </div>
          <p className="text-white/80 text-sm">{formatDate(currentTime)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-120px)]">
        {/* Main Display Area - 75% width */}
        <div className="lg:col-span-3 space-y-6">
          {/* Vehicle Showcase */}
          <MediaSlideshow vehicle={selectedVehicle} />
          
          {/* Vehicle Details */}
          <VehicleDetails vehicle={selectedVehicle} />
        </div>

        {/* Right Sidebar - 25% width */}
        <div className="space-y-6">
          {/* Appointment Calendar */}
          <AppointmentCalendar />
          
          {/* Showroom Tools */}
          <ShowroomTools 
            selectedVehicle={selectedVehicle}
            onVehicleSelect={setSelectedVehicle}
            onGenerateLink={generateCustomerLink}
          />
        </div>
      </div>
    </div>
  );
};

export default ShowroomView;
