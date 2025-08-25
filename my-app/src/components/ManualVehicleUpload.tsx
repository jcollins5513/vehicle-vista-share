'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Car, 
  Loader2, 
  CheckCircle,
  Image as ImageIcon,
  Wand2
} from 'lucide-react';
import Image from 'next/image';

interface ManualVehicle {
  id: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  color?: string;
  price?: number;
  mileage?: number;
  features: string[];
  originalImageUrl: string;
  processedImageUrl?: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
}

interface ManualVehicleUploadProps {
  onVehicleProcessed?: (vehicle: ManualVehicle) => void;
}

export function ManualVehicleUpload({ onVehicleProcessed }: ManualVehicleUploadProps) {
  const [vehicle, setVehicle] = useState<Partial<ManualVehicle>>({
    features: [],
    status: 'uploaded'
  });
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'manual-vehicles');

      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setUploadedImage(data.asset.url);
        setVehicle(prev => ({
          ...prev,
          originalImageUrl: data.asset.url,
          id: `manual-${Date.now()}`
        }));
      } else {
        alert(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFeatureAdd = (feature: string) => {
    if (feature.trim() && !vehicle.features?.includes(feature.trim())) {
      setVehicle(prev => ({
        ...prev,
        features: [...(prev.features || []), feature.trim()]
      }));
    }
  };

  const handleFeatureRemove = (feature: string) => {
    setVehicle(prev => ({
      ...prev,
      features: prev.features?.filter(f => f !== feature) || []
    }));
  };

  const processBackgroundRemoval = async () => {
    if (!vehicle.originalImageUrl || !vehicle.stockNumber) {
      alert('Please upload an image and enter a stock number first.');
      return;
    }

    setProcessing(true);
    setVehicle(prev => ({ ...prev, status: 'processing' }));

    try {
      // Convert image URL to base64 for background removal
      const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(vehicle.originalImageUrl)}`);
      const blob = await response.blob();
      
      // Use browser-based background removal
      const { removeBackground } = await import('@imgly/background-removal');
      const result = await removeBackground(blob, {
        output: {
          format: 'image/png',
          quality: 0.8
        }
      });

      // Convert result to blob and upload to assets
      let processedBlob: Blob;
      if (result instanceof Blob) {
        processedBlob = result;
      } else if (typeof result === 'string') {
        const response = await fetch(result);
        processedBlob = await response.blob();
      } else {
        throw new Error('Unexpected result format from background removal');
      }

      // Upload processed image
      const formData = new FormData();
      formData.append('file', processedBlob, `${vehicle.stockNumber}-processed.png`);
      formData.append('category', 'processed-vehicles');

      const uploadResponse = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadData = await uploadResponse.json();
      
      if (uploadData.success) {
        const completedVehicle: ManualVehicle = {
          ...vehicle as ManualVehicle,
          processedImageUrl: uploadData.asset.url,
          status: 'completed'
        };
        
        setVehicle(completedVehicle);
        onVehicleProcessed?.(completedVehicle);
      } else {
        throw new Error(uploadData.error || 'Failed to upload processed image');
      }

    } catch (error) {
      console.error('Error processing background removal:', error);
      setVehicle(prev => ({ ...prev, status: 'failed' }));
      alert(`Background removal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setVehicle({ features: [], status: 'uploaded' });
    setUploadedImage(null);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Car className="w-5 h-5 mr-2" />
            Manual Vehicle Upload
          </CardTitle>
          <CardDescription className="text-white/70">
            Upload a vehicle image and add details for content creation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Image Upload */}
          <div className="space-y-4">
            <Label htmlFor="vehicle-image" className="text-white text-sm font-medium">
              Vehicle Image
            </Label>
            <div className="flex items-center gap-4">
              <Input
                id="vehicle-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="bg-white/10 border-white/20 text-white file:bg-white/20 file:border-0 file:text-white"
              />
              {uploading && <Loader2 className="w-5 h-5 animate-spin text-white" />}
            </div>
            
            {uploadedImage && (
              <div className="relative w-full max-w-md">
                <Image
                  src={uploadedImage}
                  alt="Uploaded vehicle"
                  width={400}
                  height={300}
                  className="w-full h-auto rounded-lg border border-white/20"
                />
                {vehicle.processedImageUrl && (
                  <div className="mt-4">
                    <Label className="text-white text-sm font-medium">Processed (Background Removed)</Label>
                    <Image
                      src={vehicle.processedImageUrl}
                      alt="Processed vehicle"
                      width={400}
                      height={300}
                      className="w-full h-auto rounded-lg border border-white/20 mt-2"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Vehicle Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="stock-number" className="text-white text-sm font-medium">
                Stock Number *
              </Label>
              <Input
                id="stock-number"
                value={vehicle.stockNumber || ''}
                onChange={(e) => setVehicle(prev => ({ ...prev, stockNumber: e.target.value }))}
                placeholder="e.g., MANUAL001"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>
            <div>
              <Label htmlFor="year" className="text-white text-sm font-medium">
                Year *
              </Label>
              <Input
                id="year"
                type="number"
                value={vehicle.year || ''}
                onChange={(e) => setVehicle(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                placeholder="2024"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>
            <div>
              <Label htmlFor="make" className="text-white text-sm font-medium">
                Make *
              </Label>
              <Input
                id="make"
                value={vehicle.make || ''}
                onChange={(e) => setVehicle(prev => ({ ...prev, make: e.target.value }))}
                placeholder="e.g., BMW"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>
            <div>
              <Label htmlFor="model" className="text-white text-sm font-medium">
                Model *
              </Label>
              <Input
                id="model"
                value={vehicle.model || ''}
                onChange={(e) => setVehicle(prev => ({ ...prev, model: e.target.value }))}
                placeholder="e.g., X5"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>
            <div>
              <Label htmlFor="color" className="text-white text-sm font-medium">
                Color
              </Label>
              <Input
                id="color"
                value={vehicle.color || ''}
                onChange={(e) => setVehicle(prev => ({ ...prev, color: e.target.value }))}
                placeholder="e.g., Black"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>
            <div>
              <Label htmlFor="price" className="text-white text-sm font-medium">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                value={vehicle.price || ''}
                onChange={(e) => setVehicle(prev => ({ ...prev, price: parseInt(e.target.value) }))}
                placeholder="75000"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>
            <div>
              <Label htmlFor="mileage" className="text-white text-sm font-medium">
                Mileage
              </Label>
              <Input
                id="mileage"
                type="number"
                value={vehicle.mileage || ''}
                onChange={(e) => setVehicle(prev => ({ ...prev, mileage: parseInt(e.target.value) }))}
                placeholder="25000"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>
          </div>

          {/* Features */}
          <div>
            <Label className="text-white text-sm font-medium">Features</Label>
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a feature..."
                  className="bg-white/10 border-white/20 text-white placeholder-white/50"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleFeatureAdd(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    handleFeatureAdd(input.value);
                    input.value = '';
                  }}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {vehicle.features?.map((feature, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 cursor-pointer"
                    onClick={() => handleFeatureRemove(feature)}
                  >
                    {feature} ×
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={processBackgroundRemoval}
              disabled={processing || !uploadedImage || !vehicle.stockNumber}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              {processing ? 'Processing...' : 'Remove Background'}
            </Button>
            
            <Button
              onClick={resetForm}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Reset
            </Button>
          </div>

          {/* Status */}
          {vehicle.status && vehicle.status !== 'uploaded' && (
            <div className="flex items-center gap-2">
              {vehicle.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
              {vehicle.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-400" />}
              {vehicle.status === 'failed' && <ImageIcon className="w-4 h-4 text-red-400" />}
              <span className="text-white text-sm">
                Status: {vehicle.status}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}