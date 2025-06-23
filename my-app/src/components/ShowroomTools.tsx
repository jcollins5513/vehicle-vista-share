
import React, { useState } from 'react';
import { Facebook, Share2, Image, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import VehicleSelector from './VehicleSelector';

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

interface ShowroomToolsProps {
  selectedVehicle: Vehicle;
  onVehicleSelect: (vehicle: Vehicle) => void;
  onGenerateLink: () => void;
}

const ShowroomTools = ({ selectedVehicle, onVehicleSelect, onGenerateLink }: ShowroomToolsProps) => {
  const [mediaUploadCount, setMediaUploadCount] = useState(0);

  const postToFacebook = () => {
    // In real implementation, this would integrate with Facebook API
    alert('Facebook integration will be connected to post vehicle content');
  };

  const handleMediaUpload = () => {
    // In real implementation, this would handle file uploads
    setMediaUploadCount(prev => prev + 1);
    alert('Media upload feature will integrate with file system and database');
  };

  return (
    <div className="space-y-4">
      {/* Showroom Tools Header */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
        <h3 className="text-white font-bold text-lg mb-4 flex items-center">
          <Image className="w-5 h-5 mr-2" />
          Showroom Tools
        </h3>
        <p className="text-white/60 text-sm">Marketing & Display</p>
      </Card>

      {/* Post to Facebook */}
      <Card className="bg-blue-600/20 backdrop-blur-sm border-blue-400/30 p-4">
        <Button 
          onClick={postToFacebook}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
        >
          <Facebook className="w-4 h-4 mr-2" />
          Post to Facebook
        </Button>
        <p className="text-white/60 text-xs mt-2">Share current vehicle</p>
      </Card>

      {/* Vehicle Selection */}
      <VehicleSelector 
        currentVehicle={selectedVehicle}
        onVehicleSelect={onVehicleSelect}
        isCustomerView={false}
      />

      {/* Media Selection */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
        <h4 className="text-white font-semibold mb-3 flex items-center">
          <Image className="w-4 h-4 mr-2" />
          Media Selection
        </h4>
        <Button 
          onClick={handleMediaUpload}
          variant="outline" 
          className="w-full mb-2 border-white/30 text-white hover:bg-white/10"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Media
        </Button>
        <p className="text-white/60 text-xs">{mediaUploadCount} items loaded</p>
      </Card>

      {/* Generate Customer Link */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
        <Button 
          onClick={onGenerateLink}
          className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Generate Customer Link
        </Button>
        <p className="text-white/60 text-xs mt-2">Share with customers</p>
      </Card>
    </div>
  );
};

export default ShowroomTools;
