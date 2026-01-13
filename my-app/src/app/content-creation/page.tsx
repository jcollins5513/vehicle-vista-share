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
  Upload,
  Loader2
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
  
  // Single vehicle selection
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Batch selection
  const [batchVehicles, setBatchVehicles] = useState<Vehicle[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);

  const [activeTab, setActiveTab] = useState('manual-upload');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [hasAppliedSearchParam, setHasAppliedSearchParam] = useState(false);
  
  const searchParams = useSearchParams();

  useEffect(() => {
    // Load everything in parallel
    const loadAll = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchProcessedImages(), fetchVehicles(), fetchAssets()]);
      } catch (err) {
        console.error("Initialization error:", err);
        // Don't block UI on error, just show empty state or specific error
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // Handle Search Params (Deep Linking)
  useEffect(() => {
    if (loading || hasAppliedSearchParam) return;

    const stockParam = searchParams?.get('stockNumber');
    const batchParam = searchParams?.get('batch');

    if (batchParam) {
      // BATCH MODE
      const stocks = batchParam.split(',').map(s => s.trim()).filter(Boolean);
      const foundVehicles: Vehicle[] = [];

      stocks.forEach(stock => {
        let v = vehicles.find(v => v.stockNumber.toLowerCase() === stock.toLowerCase());
        if (!v) {
          // Create Stub if not found in inventory
          v = {
            id: `stub-${stock}`,
            stockNumber: stock.toUpperCase(),
            year: 2025,
            make: 'Unknown',
            model: 'Vehicle',
            vin: 'UNKNOWN',
            color: 'Unknown',
            price: 0,
            mileage: 0,
            status: 'available',
            images: [],
            features: [],
            isNew: true
          };
        }
        if (v) foundVehicles.push(v);
      });

      if (foundVehicles.length > 0) {
        setBatchVehicles(foundVehicles);
        setSelectedVehicle(foundVehicles[0]); // Select first as template
        setIsBatchMode(true);
        setActiveTab('visual-editor');
      }
      setHasAppliedSearchParam(true);

    } else if (stockParam) {
      // SINGLE MODE
      let v = vehicles.find(v => v.stockNumber.toLowerCase() === stockParam.toLowerCase());
      
      if (!v) {
         // Create stub if missing from inventory feed but passed in URL
         v = {
            id: `stub-${stockParam}`,
            stockNumber: stockParam.toUpperCase(),
            year: 2025,
            make: 'Unknown',
            model: 'Vehicle',
            vin: 'UNKNOWN',
            color: 'Unknown',
            price: 0,
            mileage: 0,
            status: 'available',
            images: [],
            features: [],
            isNew: true
         };
      }

      // Only switch if we actually have images or user specifically requested this stock
      if (v) setSelectedVehicle(v);
      setSearchTerm(stockParam);
      
      const hasImages = processedImages[v.stockNumber] && processedImages[v.stockNumber].length > 0;
      if (hasImages) {
        setActiveTab('visual-editor');
      } else {
        // stay on selection or manual upload?
        // If specific stock requested, maybe show manual upload for it?
        setActiveTab('vehicle-selection');
      }
      setHasAppliedSearchParam(true);
    }
  }, [loading, searchParams, hasAppliedSearchParam, vehicles, processedImages]);

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/assets');
      const data = await response.json();
      if (data.success) setAssets(data.assets);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const handleManualPhotosUploaded = async (stockNumber: string, photos: { originalUrl: string; processedUrl?: string; isMarketingAsset?: boolean; category?: string }[]) => {
    const processedImagesData = photos.map((photo, index) => ({
      originalUrl: photo.originalUrl,
      processedUrl: photo.processedUrl || photo.originalUrl,
      processedAt: new Date(),
      status: 'completed' as const,
      imageIndex: index,
      isMarketingAsset: photo.isMarketingAsset || false,
      category: photo.category || 'vehicle-photos'
    }));

    try {
      await fetch('/api/processed-images/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockNumber, processedImages: processedImagesData })
      });
    } catch (error) {
      console.error('Error saving processed images to Redis:', error);
    }

    setProcessedImages(prev => ({
      ...prev,
      [stockNumber]: [ ...(prev[stockNumber] || []), ...processedImagesData ]
    }));
  };

  const fetchProcessedImages = async () => {
    try {
      // Don't set loading here to avoid flickering if called multiple times
      const response = await fetch('/api/processed-images/all');
      const data = await response.json();
      if (data.success) {
        setProcessedImages(data.processedImages);
      } else {
        throw new Error(data.error || 'Failed to fetch processed images');
      }
    } catch (error) {
      console.error('Error fetching processed images:', error);
      setError('Failed to load processed images');
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      const data = await response.json();
      if (data.success) setVehicles(data.vehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
       // Don't set global error, just log it. We can survive without vehicle data (using stubs).
    }
  };

  const getVehicleByStockNumber = (stockNumber: string): Vehicle | undefined => {
    return vehicles.find(v => v.stockNumber === stockNumber);
  };

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
    setBatchVehicles([]); // Clear batch if single select
    setIsBatchMode(false);
    setActiveTab('visual-editor');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mb-4"></div>
          <p className="text-lg">Loading content creation tools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Content Creation Studio</h1>
          <p className="text-muted-foreground text-lg">Create stunning marketing content for your vehicles</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-destructive">{error}</p>
            <button
              onClick={() => { setError(null); Promise.all([fetchProcessedImages(), fetchVehicles(), fetchAssets()]); }}
              className="mt-2 text-destructive hover:text-destructive/80 underline"
            >
              Retry
            </button>
          </div>
        )}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual-upload">
              <Upload className="w-4 h-4 mr-2" />
              Manual Upload
            </TabsTrigger>
            <TabsTrigger value="vehicle-selection">
              <Car className="w-4 h-4 mr-2" />
              Select Vehicle
            </TabsTrigger>
            <TabsTrigger value="visual-editor" disabled={!selectedVehicle}>
              <Palette className="w-4 h-4 mr-2" />
              Visual Editor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual-upload" className="space-y-6">
            {/* Manual Upload Content */}
            <ManualVehiclePhotoUpload 
              vehicles={vehicles}
              onPhotosUploaded={handleManualPhotosUploaded}
              onAssetsUploaded={(assets) => {
                 fetchAssets();
                 alert(`Successfully uploaded ${assets.length} assets!`);
              }}
            />
          </TabsContent>

          <TabsContent value="vehicle-selection" className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by stock number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-muted border-border text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredImages.map(([stockNumber, images]) => {
                   const vehicle = getVehicleByStockNumber(stockNumber);
                   return (
                     <Card
                       key={stockNumber}
                       className={`transition-all cursor-pointer ${selectedVehicle?.stockNumber === stockNumber ? 'ring-2 ring-primary' : ''}`}
                       onClick={() => handleVehicleSelect(vehicle || { stockNumber, year: 2025, make: 'Unknown', model: 'Vehicle' } as Vehicle)}
                     >
                       <CardHeader>
                         <CardTitle className="flex items-center">
                           <Car className="w-5 h-5 mr-2" />
                           {vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : `Stock #${stockNumber}`}
                         </CardTitle>
                         <CardDescription>
                           {images.length} image{images.length !== 1 ? 's' : ''}
                         </CardDescription>
                       </CardHeader>
                       <CardContent>
                         <div className="aspect-video relative rounded-lg overflow-hidden border border-border bg-muted">
                           {images[0] && (
                             <Image
                               src={images[0].processedUrl}
                               alt="Vehicle"
                               fill
                               className="object-cover"
                             />
                           )}
                         </div>
                         <Button className="w-full mt-4">Select</Button>
                       </CardContent>
                     </Card>
                   );
                 })}
                 {filteredImages.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                       No vehicles found. Try uploading some!
                    </div>
                 )}
            </div>
          </TabsContent>

          <TabsContent value="visual-editor" className="space-y-6">
            {selectedVehicle ? (
              <UnifiedVisualEditor
                selectedVehicle={selectedVehicle}
                vehicleImages={processedImages[selectedVehicle.stockNumber] || []}
                assets={assets}
                allVehicles={vehicles}
                allProcessedImages={processedImages}
                // Pass batch props if in batch mode
                batchVehicles={isBatchMode ? batchVehicles : undefined}
                
                onContentGenerated={() => {}}
                onAssetsUploaded={(assets) => {
                  fetchAssets();
                  alert(`Successfully uploaded ${assets.length} assets!`);
                }}
                onVehicleSelect={(vehicle) => {
                  setSelectedVehicle(vehicle);
                  setIsBatchMode(false); // Switching vehicle exits batch mode
                }}
              />
            ) : (
              <div className="text-center py-12">Please select a vehicle.</div>
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
        <div className="min-h-screen bg-background flex items-center justify-center">
           <Loader2 className="animate-spin w-8 h-8 text-primary" />
        </div>
      }
    >
      <ContentCreationInner />
    </Suspense>
  );
}
