'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DragAndDropUpload } from '@/components/DragAndDropUpload';
import { getShowroomDataAction } from '@/app/actions';
import type { VehicleWithMedia } from '@/types';
import type { WebCompanionUpload } from '@/types/webCompanion';
import Image from 'next/image';

import {
  ArrowLeft,
  Camera,
  CheckCircle,
  ExternalLink,
  RefreshCcw,
  Sparkles,
  Grid,
  List,
  CheckSquare,
  Square
} from 'lucide-react';

export default function WebCompanionSessionPage() {
  const params = useParams<{ stockNumber?: string }>();
  const router = useRouter();
  const stockNumberParam = params?.stockNumber; // DO NOT decode yet if using it raw, but decoded is better for display
  
  if (!stockNumberParam) {
    throw new Error('Missing stock number in route params');
  }

  const stockNumber = decodeURIComponent(stockNumberParam).toUpperCase();

  const [uploads, setUploads] = useState<WebCompanionUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vehicle, setVehicle] = useState<VehicleWithMedia | null>(null);
  const [isLoadingVehicle, setIsLoadingVehicle] = useState(true);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

  // Fetch Vehicle Data
  useEffect(() => {
    async function fetchVehicle() {
      try {
        const { vehicles } = await getShowroomDataAction();
        const found = vehicles.find(v => 
          v.stockNumber?.trim().toUpperCase() === stockNumber.trim()
        );
        setVehicle(found || null);
      } catch (err) {
        console.error('Failed to load vehicle:', err);
      } finally {
        setIsLoadingVehicle(false);
      }
    }
    fetchVehicle();
  }, [stockNumber]);

  const fetchUploads = useCallback(
    async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/web-companion/uploads?stockNumber=${encodeURIComponent(stockNumber)}`
        );
        const data = await response.json();
        if (data.success) {
          setUploads(data.uploads);
        }
      } catch (error) {
        console.error('Error loading uploads', error);
      } finally {
        setIsLoading(false);
      }
    },
    [stockNumber]
  );

  const handleFileDrop = useCallback(
    async (files: FileList) => {
      const incoming = Array.from(files);
      for (const file of incoming) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('stockNumber', stockNumber);

        await fetch('/api/web-companion/uploads', {
          method: 'POST',
          body: formData,
        });
      }
      fetchUploads();
    },
    [stockNumber, fetchUploads]
  );

  useEffect(() => {
    fetchUploads();
    const interval = setInterval(() => fetchUploads(), 5000);
    return () => clearInterval(interval);
  }, [fetchUploads]);

  const toggleSelection = (id: string) => {
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedImageIds.size === processedUploads.length) {
      setSelectedImageIds(new Set());
    } else {
      setSelectedImageIds(new Set(processedUploads.map(u => u.id)));
    }
  };

  const processedUploads = uploads.filter(u => u.status === 'processed');
  const pendingCount = uploads.filter(u => u.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/web-companion')}
          className="text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Gallery
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-8 border-b pb-6">
          <div>
            <p className="text-primary text-sm uppercase tracking-wide mb-2 font-semibold font-sans">
              Vehicle Session
            </p>
            {isLoadingVehicle ? (
               <div className="animate-pulse h-12 w-64 bg-muted rounded"></div>
            ) : vehicle ? (
              <>
                <h1 className="text-4xl font-bold font-sans">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-muted-foreground font-sans text-lg">
                  <span>Stock #{vehicle.stockNumber}</span>
                  {vehicle.price && (
                    <>
                      <span>•</span>
                      <span>${vehicle.price?.toLocaleString()}</span>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold font-sans">
                  Stock #{stockNumber}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Managing assets for stock #{stockNumber}
                </p>
              </>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-3">
             <div className="flex gap-2">
                <Button variant="outline" onClick={() => fetchUploads()}>
                   <RefreshCcw className="w-4 h-4 mr-2" />
                   Sync
                </Button>
                <Button 
                   className="bg-blue-600 hover:bg-blue-700 text-white"
                   onClick={() => router.push(`/content-creation?stockNumber=${encodeURIComponent(stockNumber)}`)}
                >
                   <Sparkles className="w-4 h-4 mr-2" />
                   Open Editor ({processedUploads.length})
                </Button>
             </div>
             {pendingCount > 0 && (
                <Badge variant="outline" className="animate-pulse border-yellow-500 text-yellow-500">
                   Processing {pendingCount} images...
                </Badge>
             )}
          </div>
        </div>

        {/* Upload Area */}
        <div className="mb-8">
           <DragAndDropUpload
             onFilesDrop={handleFileDrop}
             accept="image/*"
             isUploading={isLoading}
             uploadText="Drop new captures here"
             uploadSubtext="Images are automatically processed and added to the gallery below"
             className="h-32"
           />
        </div>

        {/* Gallery Grid */}
        <div className="space-y-4">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                 <Grid className="w-5 h-5" />
                 Processed Assets ({processedUploads.length})
              </h2>
              {processedUploads.length > 0 && (
                <div className="flex items-center gap-2">
                   <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                      {selectedImageIds.size === processedUploads.length ? (
                         <><CheckSquare className="w-4 h-4 mr-2" /> Deselect All</>
                      ) : (
                         <><Square className="w-4 h-4 mr-2" /> Select All</>
                      )}
                   </Button>
                   {selectedImageIds.size > 0 && (
                      <Button size="sm" onClick={() => router.push(`/content-creation?stockNumber=${encodeURIComponent(stockNumber)}`)}>
                         Add {selectedImageIds.size} to Background
                      </Button>
                   )}
                </div>
              )}
           </div>

           {processedUploads.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/10">
                 <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                 <p className="text-muted-foreground">No processed images found yet.</p>
                 <p className="text-xs text-muted-foreground mt-2">Uploads from iOS or drag-and-drop will appear here.</p>
              </div>
           ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 {processedUploads.map((upload) => (
                    <Card 
                       key={upload.id} 
                       className={`overflow-hidden group cursor-pointer transition-all border-2 ${selectedImageIds.has(upload.id) ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-border'}`}
                       onClick={() => toggleSelection(upload.id)}
                    >
                       <div className="aspect-[4/3] relative bg-muted">
                          {upload.processedUrl && (
                             <Image 
                                src={upload.processedUrl}
                                alt="Processed Asset"
                                fill
                                className="object-cover"
                             />
                          )}
                          <div className="absolute top-2 left-2">
                             <Checkbox 
                                checked={selectedImageIds.has(upload.id)}
                                onCheckedChange={() => toggleSelection(upload.id)}
                                className="bg-background/80 backdrop-blur"
                             />
                          </div>
                          {upload.imageIndex !== undefined && (
                             <div className="absolute bottom-2 right-2">
                                <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur text-xs">
                                   #{upload.imageIndex}
                                </Badge>
                             </div>
                          )}
                       </div>
                    </Card>
                 ))}
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
