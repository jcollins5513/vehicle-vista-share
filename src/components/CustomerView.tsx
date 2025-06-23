
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Car, Clock, Fuel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import MediaSlideshow from './MediaSlideshow';
import VehicleSelector from './VehicleSelector';

const CustomerView = () => {
  const { vehicleId } = useParams();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedVehicle, setSelectedVehicle] = useState({
    id: parseInt(vehicleId || '1'),
    year: 2024,
    make: "Bentley",
    model: "Continental GT",
    price: 185500,
    color: "Beluga Black",
    miles: 450,
    stock: "BT2024001",
    engine: "3.0L Twin-Turbo V6",
    transmission: "8-Speed Automatic",
    drivetrain: "xDrive AWD",
    mpg: "21/26 City/Hwy",
    features: [
      "Premium Leather Interior",
      "Adaptive Cruise Control",
      "360° Camera System",
      "Heated & Ventilated Seats",
      "Bang & Olufsen Sound System"
    ]
  });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
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
      {/* Top Section - Date, Time, and Vehicle Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Date and Time */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
          <div className="flex items-center text-white mb-4">
            <Clock className="w-6 h-6 mr-3" />
            <div>
              <div className="text-2xl font-mono font-bold">{formatTime(currentTime)}</div>
              <div className="text-white/80">{formatDate(currentTime)}</div>
            </div>
          </div>
        </Card>

        {/* Vehicle Overview */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
          <div className="text-white">
            <h2 className="text-2xl font-bold mb-2">
              {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
            </h2>
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
                <span className="ml-2">{selectedVehicle.miles} mi</span>
              </div>
              <div>
                <span className="text-white/60">Stock:</span>
                <span className="ml-2">{selectedVehicle.stock}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Vehicle Display */}
        <div className="lg:col-span-3 space-y-6">
          <MediaSlideshow vehicle={selectedVehicle} />
          
          {/* Vehicle Specifications */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
            <h3 className="text-white text-xl font-bold mb-4 flex items-center">
              <Car className="w-6 h-6 mr-2" />
              Performance & Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="text-white">
                  <span className="text-white/60">Engine:</span>
                  <span className="ml-2">{selectedVehicle.engine}</span>
                </div>
                <div className="text-white">
                  <span className="text-white/60">Transmission:</span>
                  <span className="ml-2">{selectedVehicle.transmission}</span>
                </div>
                <div className="text-white">
                  <span className="text-white/60">Drivetrain:</span>
                  <span className="ml-2">{selectedVehicle.drivetrain}</span>
                </div>
                <div className="text-white flex items-center">
                  <Fuel className="w-4 h-4 mr-1 text-white/60" />
                  <span className="text-white/60">MPG:</span>
                  <span className="ml-2">{selectedVehicle.mpg}</span>
                </div>
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

export default CustomerView;
