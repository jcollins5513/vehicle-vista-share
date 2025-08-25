'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  Car, 
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  Scissors
} from 'lucide-react';
import Image from 'next/image';


interface Vehicle {
  id: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  color?: string;
  price?: number;
  mileage?: number;
  features: string[];
}

interface ManualVehiclePhotoUploadProps {
  vehicles: Vehicle[];
  onPhotosUploaded: (stockNumber: string, photos: { originalUrl: string; processedUrl?: string }[]) => void;
  onAssetsUploaded?: (assets: { originalUrl: string; processedUrl?: string; name: string }[]) => void;
}

interface UploadedPhoto {
  id: string;
  file: File;
  originalUrl: string;
  processedUrl?: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
}

export function ManualVehiclePhotoUpload({ vehicles, onPhotosUploaded, onAssetsUploaded }: ManualVehiclePhotoUploadProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [stockNumberInput, setStockNumberInput] = useState<string>('');
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'vehicle' | 'assets'>('vehicle');

  const handleFileUpload = async (files: FileList) => {
    if (!selectedVehicle && !stockNumberInput.trim()) {
      alert('Please select a vehicle or enter a stock number first');
      return;
    }

    const stockNumber = selectedVehicle || stockNumberInput.trim();
    setIsUploading(true);

    try {
      const newPhotos: UploadedPhoto[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const photoId = `photo-${Date.now()}-${i}`;
        
        // Create object URL for preview
        const originalUrl = URL.createObjectURL(file);
        
        const photo: UploadedPhoto = {
          id: photoId,
          file,
          originalUrl,
          status: 'uploaded'
        };

        newPhotos.push(photo);
      }

      setUploadedPhotos(prev => [...prev, ...newPhotos]);
      
    } catch (error) {
      console.error('Error uploading photos:', error);
      alert('Failed to upload photos');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBackgroundRemoval = async (photoId: string) => {
    const photo = uploadedPhotos.find(p => p.id === photoId);
    if (!photo) return;

    setUploadedPhotos(prev => prev.map(p => 
      p.id === photoId ? { ...p, status: 'processing' } : p
    ));

    try {
      // Use your existing background removal logic
      const processedUrl = await removeBackground(photo.originalUrl);
      
      setUploadedPhotos(prev => prev.map(p => 
        p.id === photoId ? { ...p, processedUrl, status: 'completed' } : p
      ));

    } catch (error) {
      console.error('Background removal failed:', error);
      setUploadedPhotos(prev => prev.map(p => 
        p.id === photoId ? { ...p, status: 'failed' } : p
      ));
    }
  };

  const removeBackground = async (imageUrl: string): Promise<string> => {
    // Import background removal library
    const { removeBackground: removeBg } = await import('@imgly/background-removal');
    
    // Convert to blob if needed
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    
    // Remove background
    const processedBlob = await removeBg(blob);
    
    // Create object URL for processed image
    return URL.createObjectURL(processedBlob);
  };

  const handleSavePhotos = async () => {
    const completedPhotos = uploadedPhotos.filter(p => p.status === 'completed');
    
    if (completedPhotos.length === 0) {
      alert('Please process at least one photo with background removal');
      return;
    }

    if (uploadMode === 'assets') {
      // Save as general assets
      if (onAssetsUploaded) {
        const assetData = completedPhotos.map(photo => ({
          originalUrl: photo.originalUrl,
          processedUrl: photo.processedUrl!,
          name: photo.file.name
        }));

        // Upload to S3 as general assets
        try {
          setIsUploading(true);
          
          for (const asset of assetData) {
            // Upload original
            const originalFormData = new FormData();
            const originalResponse = await fetch(asset.originalUrl);
            const originalBlob = await originalResponse.blob();
            originalFormData.append('file', originalBlob, asset.name);
            originalFormData.append('category', 'manual-uploads');

            await fetch('/api/assets/upload', {
              method: 'POST',
              body: originalFormData
            });

            // Upload processed
            if (asset.processedUrl) {
              const processedFormData = new FormData();
              const processedResponse = await fetch(asset.processedUrl);
              const processedBlob = await processedResponse.blob();
              const processedName = asset.name.replace(/\.[^/.]+$/, '_processed.png');
              processedFormData.append('file', processedBlob, processedName);
              processedFormData.append('category', 'background-removed');

              await fetch('/api/assets/upload', {
                method: 'POST',
                body: processedFormData
              });
            }
          }

          onAssetsUploaded(assetData);
          alert(`Added ${completedPhotos.length} assets to general library`);
        } catch (error) {
          console.error('Error uploading assets:', error);
          alert('Failed to upload assets');
        } finally {
          setIsUploading(false);
        }
      }
    } else {
      // Save to vehicle (existing logic)
      const stockNumber = selectedVehicle || stockNumberInput.trim();
      
      if (!stockNumber) {
        alert('Please select a vehicle or enter a stock number');
        return;
      }

      const photoData = completedPhotos.map(photo => ({
        originalUrl: photo.originalUrl,
        processedUrl: photo.processedUrl!
      }));

      onPhotosUploaded(stockNumber, photoData);
      alert(`Added ${completedPhotos.length} photos to vehicle ${stockNumber}`);
    }
    
    // Reset form
    setSelectedVehicle('');
    setStockNumberInput('');
    setUploadedPhotos([]);
  };

  const removePhoto = (photoId: string) => {
    setUploadedPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const selectedVehicleData = vehicles.find(v => v.stockNumber === selectedVehicle);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Manual Photo Upload
          </CardTitle>
          <CardDescription className="text-white/70">
            Upload photos for vehicles or create general marketing assets with background removal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Mode Toggle */}
          <div className="flex items-center gap-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Label className="text-white text-sm font-medium">Upload Mode:</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={uploadMode === 'vehicle' ? 'default' : 'outline'}
                onClick={() => setUploadMode('vehicle')}
                className="text-xs"
              >
                <Car className="w-3 h-3 mr-1" />
                Vehicle Photos
              </Button>
              <Button
                size="sm"
                variant={uploadMode === 'assets' ? 'default' : 'outline'}
                onClick={() => setUploadMode('assets')}
                className="text-xs"
              >
                <Upload className="w-3 h-3 mr-1" />
                General Assets
              </Button>
            </div>
          </div>

          {uploadMode === 'assets' && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-200 text-sm font-medium mb-1">
                📁 General Assets Mode
              </p>
              <p className="text-green-200/70 text-xs">
                Images will be saved as reusable assets, not tied to any specific vehicle. Perfect for logos, badges, and backgrounds.
              </p>
            </div>
          )}

          {/* Debug Info */}
          {vehicles.length === 0 && (
            <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-200 text-sm font-medium">
                ⚠️ No vehicles available for selection
              </p>
              <p className="text-yellow-200/70 text-xs">
                You can still enter a stock number manually below
              </p>
            </div>
          )}
          
          {/* Vehicle Selection - Only show in vehicle mode */}
          {uploadMode === 'vehicle' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-white text-sm">Select Existing Vehicle</Label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Choose a vehicle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.stockNumber} value={vehicle.stockNumber}>
                        {vehicle.stockNumber} - {vehicle.year} {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-white text-sm">Or Enter Stock Number</Label>
                <Input
                  value={stockNumberInput}
                  onChange={(e) => setStockNumberInput(e.target.value)}
                  placeholder="Enter stock number..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  disabled={!!selectedVehicle}
                />
              </div>
            </div>
          )}

          {/* Selected Vehicle Info */}
          {selectedVehicleData && uploadMode === 'vehicle' && (
            <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <p className="text-blue-200 text-sm font-medium">
                Selected: {selectedVehicleData.year} {selectedVehicleData.make} {selectedVehicleData.model}
              </p>
              <p className="text-blue-200/70 text-xs">
                Stock: {selectedVehicleData.stockNumber}
              </p>
            </div>
          )}

          {/* File Upload */}
          <div>
            <Label className="text-white text-sm">Upload Photos</Label>
            {uploadMode === 'vehicle' && (!selectedVehicle && !stockNumberInput.trim()) && (
              <p className="text-yellow-400 text-xs mt-1">
                ⚠️ Please select a vehicle or enter a stock number first
              </p>
            )}
            <div className="mt-2">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
                id="photo-upload"
                disabled={isUploading || (uploadMode === 'vehicle' && !selectedVehicle && !stockNumberInput.trim())}
              />
              <label
                htmlFor="photo-upload"
                className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  (uploadMode === 'vehicle' && !selectedVehicle && !stockNumberInput.trim()) || isUploading
                    ? 'border-white/20 bg-white/5 cursor-not-allowed'
                    : 'border-white/30 bg-white/10 hover:bg-white/20'
                }`}
              >
                <div className="text-center">
                  {isUploading ? (
                    <Loader2 className="w-8 h-8 mx-auto mb-2 text-white animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 mx-auto mb-2 text-white" />
                  )}
                  <p className="text-white text-sm">
                    {isUploading ? 'Uploading...' : 'Click to upload photos'}
                  </p>
                  <p className="text-white/70 text-xs">
                    Supports multiple images (JPG, PNG)
                  </p>
                </div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Photos */}
      {uploadedPhotos.length > 0 && (
        <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-lg">Uploaded Photos</CardTitle>
            <CardDescription className="text-white/70">
              Remove backgrounds and save to vehicle
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uploadedPhotos.map((photo) => (
                <div key={photo.id} className="relative bg-white/5 rounded-lg p-3">
                  <div className="relative aspect-video mb-3">
                    <Image
                      src={photo.processedUrl || photo.originalUrl}
                      alt="Vehicle photo"
                      fill
                      className="object-cover rounded"
                    />
                    <Button
                      onClick={() => removePhoto(photo.id)}
                      size="sm"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {photo.status === 'uploaded' && (
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                      )}
                      {photo.status === 'processing' && (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      )}
                      {photo.status === 'completed' && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      {photo.status === 'failed' && (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span className="text-white text-xs capitalize">
                        {photo.status === 'uploaded' ? 'Ready for processing' : photo.status}
                      </span>
                    </div>

                    {/* Background Removal Button */}
                    {photo.status === 'uploaded' && (
                      <Button
                        onClick={() => handleBackgroundRemoval(photo.id)}
                        size="sm"
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        <Scissors className="w-3 h-3 mr-2" />
                        Remove Background
                      </Button>
                    )}

                    {photo.status === 'failed' && (
                      <Button
                        onClick={() => handleBackgroundRemoval(photo.id)}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Save Button */}
            {uploadedPhotos.some(p => p.status === 'completed') && (
              <div className="mt-6 text-center">
                <Button
                  onClick={handleSavePhotos}
                  disabled={isUploading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  {uploadMode === 'assets' 
                    ? 'Save as General Assets' 
                    : 'Save Photos to Vehicle'
                  }
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}