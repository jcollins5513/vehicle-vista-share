"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Image as ImageIcon,
  Search,
  Car,
  Palette,
  Upload
} from 'lucide-react';
import Image from 'next/image';
import type { Vehicle, ProcessedImage } from '@/types';
import { ManualVehiclePhotoUpload } from '@/components/ManualVehiclePhotoUpload';
import { UnifiedVisualEditor } from '@/components/UnifiedVisualEditor';
import { useSearchParams } from 'next/navigation';

// Force dynamic rendering to avoid static prerender issues with search params
export const dynamic = 'force-dynamic';

interface ExtendedProcessedImage extends Omit<ProcessedImage, 'processedAt'> {
  processedAt: Date;
  isMarketingAsset?: boolean;
  category?: string;
}

interface ProcessedImagesData {
  [stockNumber: string]: ExtendedProcessedImage[];
}

interface Asset {
  key: string;
  url: string;
  fileName: string;
  category: string;
  lastModified?: Date;
  size?: number;
}

function ContentCreationInner() {
  const [processedImages, setProcessedImages] = useState<ProcessedImagesData>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState('manual-upload');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [hasAppliedSearchParam, setHasAppliedSearchParam] = useState(false);
  const [vehiclesLoaded, setVehiclesLoaded] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    Promise.all([fetchProcessedImages(), fetchVehicles(), fetchAssets()]);
  }, []);

  useEffect(() => {
    if (!searchParams || hasAppliedSearchParam || !vehiclesLoaded) return;
    const stockParam = searchParams.get('stockNumber');
    if (!stockParam) return;

    const matchingVehicle = vehicles.find(
      (vehicle) => vehicle.stockNumber.toLowerCase() === stockParam.toLowerCase()
    );

    if (matchingVehicle) {
      setSelectedVehicle(matchingVehicle);
      const hasImages =
        processedImages[matchingVehicle.stockNumber] &&
        processedImages[matchingVehicle.stockNumber].length > 0;
      setActiveTab(hasImages ? 'visual-editor' : 'vehicle-selection');
    } else {
      setSearchTerm(stockParam);
      setActiveTab('vehicle-selection');
    }

    setHasAppliedSearchParam(true);
  }, [searchParams, hasAppliedSearchParam, vehiclesLoaded, vehicles, processedImages]);

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets');
      const data = await response.json();
      
      if (data.success) {
        setAssets(data.assets);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const handleManualPhotosUploaded = async (stockNumber: string, photos: { originalUrl: string; processedUrl?: string; isMarketingAsset?: boolean; category?: string }[]) => {
    // Create processed image data
    const processedImagesData = photos.map((photo, index) => ({
      originalUrl: photo.originalUrl,
      processedUrl: photo.processedUrl || photo.originalUrl,
      processedAt: new Date(),
      status: 'completed' as const,
      imageIndex: index,
      isMarketingAsset: photo.isMarketingAsset || false,
      category: photo.category || 'vehicle-photos'
    }));

    // Save to Redis so they persist
    try {
      const response = await fetch('/api/processed-images/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockNumber,
          processedImages: processedImagesData
        })
      });

      if (!response.ok) {
        console.error('Failed to save processed images to Redis');
      } else {
        console.log('Successfully saved processed images to Redis');
      }
    } catch (error) {
      console.error('Error saving processed images to Redis:', error);
    }

    // Add the photos to the processedImages state
    setProcessedImages(prev => ({
      ...prev,
      [stockNumber]: [
        ...(prev[stockNumber] || []),
        ...processedImagesData
      ]
    }));
    
    // Don't switch tabs - stay on manual upload tab for continued asset upload
    // setActiveTab('vehicle-selection');
  };

  const fetchProcessedImages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/processed-images/all');
      const data = await response.json();

      if (data.success) {
        setProcessedImages(data.processedImages);
        console.log(`Loaded ${data.totalImages} processed images from ${data.totalVehicles} vehicles`);
      } else {
        throw new Error(data.error || 'Failed to fetch processed images');
      }
    } catch (error) {
      console.error('Error fetching processed images:', error);
      setError(error instanceof Error ? error.message : 'Failed to load processed images');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      const data = await response.json();
      
      if (data.success) {
        setVehicles(data.vehicles);
      } else {
        throw new Error(data.error || 'Failed to fetch vehicles');
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setError(error instanceof Error ? error.message : 'Failed to load vehicles');
    } finally {
      setVehiclesLoaded(true);
    }
  };

  const getVehicleByStockNumber = (stockNumber: string): Vehicle | undefined => {
    return vehicles.find(v => v.stockNumber === stockNumber);
  };

  // Filter processed images based on search term
  const filteredImages = Object.entries(processedImages).filter(([stockNumber, images]) => {
    if (!searchTerm) return images.length > 0;
    
    const vehicle = getVehicleByStockNumber(stockNumber);
    const searchLower = searchTerm.toLowerCase();
    
    return (
      stockNumber.toLowerCase().includes(searchLower) ||
      (vehicle && (
        vehicle.make.toLowerCase().includes(searchLower) ||
        vehicle.model.toLowerCase().includes(searchLower) ||
        vehicle.year.toString().includes(searchLower)
      ))
    );
  });

  const handleVehicleSelect = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setActiveTab('visual-editor');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
          <p className="text-white text-lg">Loading content creation tools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Content Creation Studio</h1>
          <p className="text-white/70 text-lg">Create stunning marketing content for your vehicles</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-200">{error}</p>
            <button
              onClick={() => {
                setError(null);
                Promise.all([fetchProcessedImages(), fetchVehicles(), fetchAssets()]);
              }}
              className="mt-2 text-red-300 hover:text-red-100 underline"
            >
              Retry
            </button>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="manual-upload" className="data-[state=active]:bg-white/20 text-white">
              <Upload className="w-4 h-4 mr-2" />
              Manual Upload
            </TabsTrigger>
            <TabsTrigger value="vehicle-selection" className="data-[state=active]:bg-white/20 text-white">
              <Car className="w-4 h-4 mr-2" />
              Select Vehicle
            </TabsTrigger>
            <TabsTrigger value="visual-editor" className="data-[state=active]:bg-white/20 text-white" disabled={!selectedVehicle}>
              <Palette className="w-4 h-4 mr-2" />
              Visual Editor
            </TabsTrigger>
          </TabsList>

          {/* Manual Upload Tab */}
          <TabsContent value="manual-upload" className="space-y-6">
            {vehicles.length === 0 && !loading && (
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 backdrop-blur-xl border-yellow-500/20 mb-4">
                <CardContent className="text-center py-8">
                  <p className="text-yellow-200 text-lg font-bold mb-2">No Vehicles Available</p>
                  <p className="text-yellow-100/70">No vehicles found in inventory. Please check your Redis connection.</p>
                </CardContent>
              </Card>
            )}
            <ManualVehiclePhotoUpload 
              vehicles={vehicles}
              onPhotosUploaded={handleManualPhotosUploaded}
              onAssetsUploaded={(assets) => {
                console.log('Assets uploaded:', assets);
                // Refresh assets list
                fetchAssets();
                // Show success message with marketing asset info
                const marketingAssets = assets.filter(asset => asset.isMarketingAsset);
                const message = marketingAssets.length > 0 
                  ? `Successfully uploaded ${assets.length} assets! ${marketingAssets.length} marked for future marketing use.`
                  : `Successfully uploaded ${assets.length} assets to general library!`;
                alert(message);
              }}
            />
          </TabsContent>

          {/* Vehicle Selection Tab */}
          <TabsContent value="vehicle-selection" className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                <Input
                  placeholder="Search by stock number, make, model, or year..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>
            </div>

            {filteredImages.length === 0 ? (
              <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
                <CardContent className="text-center py-16">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 text-white/50" />
                  <h3 className="text-white text-xl font-bold mb-2">No Vehicles Found</h3>
                  <p className="text-white/70">
                    {searchTerm 
                      ? "No vehicles match your search criteria" 
                      : "Upload vehicle photos in the Manual Upload tab to get started"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredImages.map(([stockNumber, images]) => {
                  const vehicle = getVehicleByStockNumber(stockNumber);
                  return (
                    <Card
                      key={stockNumber}
                      className={`bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20 hover:border-white/40 transition-all cursor-pointer ${
                        selectedVehicle?.stockNumber === stockNumber ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => vehicle && handleVehicleSelect(vehicle)}
                    >
                      <CardHeader>
                        <CardTitle className="text-white flex items-center">
                          <Car className="w-5 h-5 mr-2" />
                          {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : `Vehicle ${stockNumber}`}
                        </CardTitle>
                        <CardDescription className="text-white/70">
                          {images.length} processed image{images.length !== 1 ? 's' : ''} • Stock: {stockNumber}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {images.slice(0, 4).map((image, index) => (
                            <div key={index} className="aspect-video rounded-lg overflow-hidden border border-white/20">
                              <Image
                                src={image.processedUrl}
                                alt={`Vehicle ${stockNumber} - Image ${index + 1}`}
                                width={150}
                                height={100}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                        
                        {vehicle && (
                          <div className="space-y-1 text-sm">
                            {vehicle.color && (
                              <p className="text-white/70">Color: {vehicle.color}</p>
                            )}
                            {vehicle.price && (
                              <p className="text-white/70">Price: ${vehicle.price.toLocaleString()}</p>
                            )}
                            {vehicle.mileage && (
                              <p className="text-white/70">Mileage: {vehicle.mileage.toLocaleString()} miles</p>
                            )}
                          </div>
                        )}
                        
                        <Button 
                          className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            vehicle && handleVehicleSelect(vehicle);
                          }}
                        >
                          Create Content
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Visual Editor Tab */}
          <TabsContent value="visual-editor" className="space-y-6">
            {selectedVehicle && processedImages[selectedVehicle.stockNumber] ? (
              <UnifiedVisualEditor
                selectedVehicle={selectedVehicle}
                vehicleImages={processedImages[selectedVehicle.stockNumber]}
                assets={assets}
                allVehicles={vehicles}
                allProcessedImages={processedImages}
                onContentGenerated={() => {}}
                onAssetsUploaded={(assets) => {
                  console.log('Assets uploaded from Visual Editor:', assets);
                  // Refresh assets list
                  fetchAssets();
                  // Show success message with marketing asset info
                  const marketingAssets = assets.filter(asset => asset.isMarketingAsset);
                  const message = marketingAssets.length > 0 
                    ? `Successfully uploaded ${assets.length} assets! ${marketingAssets.length} marked for future marketing use.`
                    : `Successfully uploaded ${assets.length} assets to general library!`;
                  alert(message);
                }}
                onVehicleSelect={(vehicle) => {
                  setSelectedVehicle(vehicle);
                }}
              />
            ) : (
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 backdrop-blur-xl border-yellow-500/20">
                <CardContent className="text-center py-16">
                  <Car className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
                  <h3 className="text-yellow-200 text-xl font-bold mb-2">Select a Vehicle First</h3>
                  <p className="text-yellow-100/70">Go back to the Vehicle Selection tab and choose a vehicle to start creating content</p>
                  <Button 
                    onClick={() => setActiveTab('vehicle-selection')}
                    className="mt-4 bg-yellow-600 hover:bg-yellow-700"
                  >
                    Select Vehicle
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function ContentCreationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <p className="text-white/80 text-lg">Loading content creation studio...</p>
        </div>
      }
    >
      <ContentCreationInner />
    </Suspense>
  );
}
