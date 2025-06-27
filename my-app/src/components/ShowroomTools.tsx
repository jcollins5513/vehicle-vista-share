
import React, { useState } from 'react';
import { Facebook, Share2, Image } from 'lucide-react';
import MediaUploader from './MediaUploader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import VehicleSelector from './VehicleSelector';
import type { VehicleWithMedia } from '@/types';

interface ShowroomToolsProps {
  selectedVehicle: VehicleWithMedia;
  onVehicleSelect: (vehicle: VehicleWithMedia) => void;
  onGenerateLink: (vehicleIds: string[]) => void;
  vehicles: VehicleWithMedia[];
  onShowMediaGallery?: () => void;
}

const ShowroomTools = ({ selectedVehicle, onVehicleSelect, onGenerateLink, vehicles, onShowMediaGallery }: ShowroomToolsProps) => {
  const [mediaUploadCount, setMediaUploadCount] = useState(0);
  const [selectedVehicles, setSelectedVehicles] = useState<VehicleWithMedia[]>([]);
  const [shareMode, setShareMode] = useState(false);

  const postToFacebook = () => {
    // In real implementation, this would integrate with Facebook API
    alert('Facebook integration will be connected to post vehicle content');
  };

  const handleUploaded = (media: { url: string; key: string }) => {
    setMediaUploadCount((prev) => prev + 1);
    // TODO: Optionally associate media.url with selectedVehicle via API mutation
    console.log('Uploaded media:', media);
  };

  const toggleVehicleSelection = (vehicle: VehicleWithMedia) => {
    setSelectedVehicles(prev => {
      const isSelected = prev.some(v => v.id === vehicle.id);
      if (isSelected) {
        return prev.filter(v => v.id !== vehicle.id);
      } else {
        return [...prev, vehicle];
      }
    });
  };

  const handleGenerateLink = () => {
    if (selectedVehicles.length === 0) {
      // If no vehicles are explicitly selected in share mode, use the currently selected vehicle
      onGenerateLink([selectedVehicle.id]);
    } else {
      onGenerateLink(selectedVehicles.map(v => v.id));
    }
    // Reset share mode after generating link
    setShareMode(false);
    setSelectedVehicles([]);
  };

  return (
    <div className="space-y-4">
      {/* Showroom Tools Header */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
        <h3 className="text-white font-bold text-lg mb-4 flex items-center">
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image className="w-5 h-5 mr-2" aria-hidden="true" />
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
        onVehicleSelect={shareMode ? () => {} : onVehicleSelect}
        vehicles={vehicles}
        multiSelect={shareMode}
        selectedVehicles={selectedVehicles}
        onVehicleToggle={toggleVehicleSelection}
      />

      {/* Media Selection */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
        <h4 className="text-white font-semibold mb-3 flex items-center">
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image className="w-4 h-4 mr-2" aria-hidden="true" />
          Media Selection
        </h4>
        <div className="space-y-2">
          <MediaUploader onUploaded={handleUploaded} />
          {onShowMediaGallery && (
            <button
              onClick={onShowMediaGallery}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center justify-center text-sm"
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image className="w-4 h-4 mr-2" aria-hidden="true" />
              Manage Media Gallery
            </button>
          )}
          <p className="text-white/60 text-xs mt-2">{mediaUploadCount} item{mediaUploadCount!==1 && 's'} uploaded</p>
        </div>
      </Card>

      {/* Generate Customer Link */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
        {!shareMode ? (
          <Button 
            onClick={() => setShareMode(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Select Vehicles to Share
          </Button>
        ) : (
          <div className="space-y-2">
            <Button 
              onClick={handleGenerateLink}
              className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center"
              disabled={selectedVehicles.length === 0 && !selectedVehicle}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Generate Link ({selectedVehicles.length || 1} vehicle{(selectedVehicles.length > 1 || selectedVehicles.length === 0) ? 's' : ''})
            </Button>
            <Button 
              onClick={() => {
                setShareMode(false);
                setSelectedVehicles([]);
              }}
              variant="outline"
              className="w-full border-white/30 text-white hover:bg-white/10"
            >
              Cancel Selection
            </Button>
          </div>
        )}
        <p className="text-white/60 text-xs mt-2">
          {shareMode 
            ? "Select up to 3 vehicles to share with customers" 
            : "Share with customers"}
        </p>
      </Card>
    </div>
  );
};

export default ShowroomTools;
