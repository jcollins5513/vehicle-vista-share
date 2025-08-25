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
  images?: string[];
  processedImages?: Array<{
    originalUrl: string;
    processedUrl: string;
    processedAt: string;
    status: string;
    imageIndex: number;
  }>;
}

interface ManualVehiclePhotoUploadProps {
  vehicles: Vehicle[];
  onPhotosUploaded: (stockNumber: string, photos: { originalUrl: string; processedUrl?: string; isMarketingAsset?: boolean; category?: string }[]) => void;
  onAssetsUploaded?: (assets: { originalUrl: string; processedUrl?: string; name: string; isMarketingAsset?: boolean; category?: string }[]) => void;
}

interface UploadedPhoto {
  id: string;
  file: File;
  originalUrl: string;
  processedUrl?: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  isMarketingAsset?: boolean; // Mark for future marketing use
  category?: string; // Asset category for organization
}

export function ManualVehiclePhotoUpload({ vehicles, onPhotosUploaded, onAssetsUploaded }: ManualVehiclePhotoUploadProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [stockNumberInput, setStockNumberInput] = useState<string>('');
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'vehicle' | 'assets'>('vehicle');
  const [assetCategory, setAssetCategory] = useState<string>('general');
  const [markAsMarketingAsset, setMarkAsMarketingAsset] = useState<boolean>(false);
  const [isProcessingVehicleImage, setIsProcessingVehicleImage] = useState<boolean>(false);

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
          status: 'uploaded',
          isMarketingAsset: uploadMode === 'assets' ? markAsMarketingAsset : false,
          category: uploadMode === 'assets' ? assetCategory : undefined
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

  // Helper function to get blob from any URL type
  const getBlobFromUrl = async (url: string): Promise<Blob> => {
    if (url.startsWith('data:')) {
      // Handle data URLs
      const response = await fetch(url);
      return await response.blob();
    } else if (url.startsWith('blob:')) {
      // Handle blob URLs
      const response = await fetch(url);
      return await response.blob();
    } else {
      // Handle regular HTTP URLs - use proxy to avoid CORS issues
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image via proxy: ${response.status} ${response.statusText}`);
      }
      
      return await response.blob();
    }
  };

  const removeBackground = async (imageUrl: string): Promise<string> => {
    // Import background removal library
    const { removeBackground: removeBg } = await import('@imgly/background-removal');
    
    try {
      // Get blob from URL using helper function
      const blob = await getBlobFromUrl(imageUrl);
      
      // Remove background
      const processedBlob = await removeBg(blob);
      
      // Create object URL for processed image
      return URL.createObjectURL(processedBlob);
    } catch (error) {
      console.error('Error in removeBackground:', error);
      throw error;
    }
  };

  // Function to automatically process the first image of a selected vehicle
  const processVehicleFirstImage = async (vehicle: Vehicle) => {
    if (!vehicle.images || vehicle.images.length === 0) {
      console.log('No images available for vehicle:', vehicle.stockNumber);
      return;
    }

    // Check if vehicle already has processed images
    if (vehicle.processedImages && vehicle.processedImages.length > 0) {
      console.log('Vehicle already has processed images:', vehicle.stockNumber);
      return;
    }

    setIsProcessingVehicleImage(true);
    
    try {
      console.log('Processing first image for vehicle:', vehicle.stockNumber);
      
      // Get the first image URL
      const firstImageUrl = vehicle.images[0];
      console.log('Image URL type:', firstImageUrl.substring(0, 20) + '...');
      
      // Validate the image URL
      if (!firstImageUrl || firstImageUrl.trim() === '') {
        throw new Error('Invalid image URL: URL is empty or undefined');
      }
      
      // Process the image for background removal
      const processedUrl = await removeBackground(firstImageUrl);
      
      // Create a processed image object
      const processedImage = {
        originalUrl: firstImageUrl,
        processedUrl: processedUrl,
        processedAt: new Date().toISOString(),
        status: 'completed',
        imageIndex: 0,
        isMarketingAsset: false,
        category: 'vehicle-photos'
      };

      // Add to uploaded photos for display
      const photoId = `vehicle-${vehicle.stockNumber}-${Date.now()}`;
      const vehiclePhoto: UploadedPhoto = {
        id: photoId,
        file: new File([], `vehicle-${vehicle.stockNumber}.jpg`), // Placeholder file
        originalUrl: firstImageUrl,
        processedUrl: processedUrl,
        status: 'completed',
        isMarketingAsset: false,
        category: 'vehicle-photos'
      };

      setUploadedPhotos(prev => [...prev, vehiclePhoto]);
      
      console.log('Successfully processed first image for vehicle:', vehicle.stockNumber);
      
    } catch (error) {
      console.error('Error processing vehicle first image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to process first image for vehicle ${vehicle.stockNumber}: ${errorMessage}`);
    } finally {
      setIsProcessingVehicleImage(false);
    }
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
          name: photo.file.name,
          isMarketingAsset: photo.isMarketingAsset || false,
          category: photo.category || 'general'
        }));

        // Upload to S3 as general assets
        try {
          setIsUploading(true);
          
          for (const asset of assetData) {
            // Upload original
            const originalFormData = new FormData();
            const originalBlob = await getBlobFromUrl(asset.originalUrl);
            originalFormData.append('file', originalBlob, asset.name);
            originalFormData.append('category', asset.category);
            originalFormData.append('isMarketingAsset', asset.isMarketingAsset.toString());

            await fetch('/api/assets/upload', {
              method: 'POST',
              body: originalFormData
            });

            // Upload processed
            if (asset.processedUrl) {
              const processedFormData = new FormData();
              const processedBlob = await getBlobFromUrl(asset.processedUrl);
              const processedName = asset.name.replace(/\.[^/.]+$/, '_processed.png');
              processedFormData.append('file', processedBlob, processedName);
              processedFormData.append('category', asset.category);
              processedFormData.append('isMarketingAsset', asset.isMarketingAsset.toString());

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
        processedUrl: photo.processedUrl!,
        isMarketingAsset: photo.isMarketingAsset || false,
        category: photo.category || 'vehicle-photos'
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

  // Auto-process first image when vehicle is selected (if no processed images exist)
  React.useEffect(() => {
    if (selectedVehicleData && uploadMode === 'vehicle') {
      // Check if vehicle has images but no processed images
      if (selectedVehicleData.images && selectedVehicleData.images.length > 0) {
        const hasProcessedImages = selectedVehicleData.processedImages && selectedVehicleData.processedImages.length > 0;
        
        if (!hasProcessedImages) {
          console.log('Auto-processing first image for selected vehicle:', selectedVehicleData.stockNumber);
          processVehicleFirstImage(selectedVehicleData);
        }
      }
    }
  }, [selectedVehicle, uploadMode]);

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
            <div className="space-y-4">
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-200 text-sm font-medium mb-1">
                  📁 General Assets Mode
                </p>
                <p className="text-green-200/70 text-xs">
                  Images will be saved as reusable assets, not tied to any specific vehicle. Perfect for logos, badges, and backgrounds.
                </p>
              </div>
              
              {/* Asset Category Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white text-sm">Asset Category</Label>
                  <Select value={assetCategory} onValueChange={setAssetCategory}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Choose category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="logos">Logos & Branding</SelectItem>
                      <SelectItem value="backgrounds">Backgrounds</SelectItem>
                      <SelectItem value="badges">Badges & Icons</SelectItem>
                      <SelectItem value="textures">Textures & Patterns</SelectItem>
                      <SelectItem value="overlays">Overlays & Effects</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="marketing-asset"
                    checked={markAsMarketingAsset}
                    onChange={(e) => setMarkAsMarketingAsset(e.target.checked)}
                    className="rounded border-white/20 bg-white/10"
                  />
                  <Label htmlFor="marketing-asset" className="text-white text-sm">
                    Mark for future marketing use
                  </Label>
                </div>
              </div>
              
              {markAsMarketingAsset && (
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-blue-200 text-xs">
                    ✅ This asset will be saved to your marketing library for future content creation
                  </p>
                </div>
              )}
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
              {isProcessingVehicleImage && (
                <div className="flex items-center gap-2 mt-2">
                  <Loader2 className="w-4 h-4 text-blue-300 animate-spin" />
                  <span className="text-blue-300 text-xs">
                    Processing first image...
                  </span>
                </div>
              )}
              {selectedVehicleData.images && selectedVehicleData.images.length > 0 && (
                <p className="text-blue-200/70 text-xs mt-1">
                  {selectedVehicleData.images.length} image{selectedVehicleData.images.length !== 1 ? 's' : ''} available
                </p>
              )}
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