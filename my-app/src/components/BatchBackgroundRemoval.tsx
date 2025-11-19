'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Scissors, Loader2, CheckCircle, XCircle, Image } from 'lucide-react';
import type { VehicleWithMedia } from '@/types';

interface BatchBackgroundRemovalProps {
  vehicles: VehicleWithMedia[];
  isOpen: boolean;
  onClose: () => void;
}

export function BatchBackgroundRemoval({ 
  vehicles, 
  isOpen, 
  onClose 
}: BatchBackgroundRemovalProps) {
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<{ [vehicleId: string]: any }>({});
  const [currentOperation, setCurrentOperation] = useState('');

  // Helper function to convert image URL to base64
  const urlToBase64 = async (url: string): Promise<string> => {
    try {
      // Use proxy API to avoid CORS issues
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });
    } catch (error) {
      throw new Error(`Failed to convert image to base64: ${error}`);
    }
  };

  const toggleVehicleSelection = (stockNumber: string) => {
    setSelectedVehicles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stockNumber)) {
        newSet.delete(stockNumber);
      } else {
        newSet.add(stockNumber);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const vehiclesWithImages = vehicles.filter(v => v.images && v.images.length > 0);
    setSelectedVehicles(new Set(vehiclesWithImages.map(v => v.stockNumber)));
  };

  const clearSelection = () => {
    setSelectedVehicles(new Set());
  };

  const processBatch = async () => {
    if (selectedVehicles.size === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setResults({});
    setCurrentOperation('Starting batch processing...');

    try {
      const vehicleIds = Array.from(selectedVehicles);
      const results: Record<string, any> = {};
      
      // Process each vehicle's first image
      for (let i = 0; i < vehicleIds.length; i++) {
        const vehicleId = vehicleIds[i];
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (!vehicle || !vehicle.images || vehicle.images.length === 0) {
          results[vehicleId] = { status: 'failed', error: 'No images available' };
          continue;
        }

        try {
          setCurrentOperation(`Processing ${vehicle.make} ${vehicle.model} (${i + 1}/${vehicleIds.length})...`);
          setProgress(((i + 1) / vehicleIds.length) * 100);

          // Convert image URL to base64
          const imageUrl = vehicle.images[0];
          const base64 = await urlToBase64(imageUrl);
          
          // Use @imgly/background-removal for browser-based processing
          const { removeBackground } = await import('@imgly/background-removal');
          
          const result = await removeBackground(base64, {
            output: {
              format: 'image/png',
              quality: 0.8
            }
          });

          // Handle the result
          let processedImageUrl: string;
          if (typeof result === 'string') {
            processedImageUrl = result;
          } else if (result instanceof Blob) {
            processedImageUrl = URL.createObjectURL(result);
          } else {
            throw new Error('Unexpected result format from background removal');
          }

          results[vehicle.stockNumber] = {
            status: 'completed',
            originalUrl: imageUrl,
            processedUrl: processedImageUrl,
            vehicle: vehicle
          };
        } catch (error) {
          console.error(`Error processing vehicle ${vehicle.stockNumber}:`, error);
          results[vehicle.stockNumber] = {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            vehicle: vehicle
          };
        }
      }

      setResults(results);
      setProgress(100);
      setCurrentOperation('Batch processing completed!');
    } catch (error) {
      console.error('Error in batch processing:', error);
      setCurrentOperation(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getResultIcon = (vehicleId: string) => {
    const result = results[vehicleId];
    if (!result) return null;
    
    if (result.status === 'completed') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    } else if (result.status === 'failed') {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
  };

  const vehiclesWithImages = vehicles.filter(v => v.images && v.images.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-slate-900 border-slate-700">
        <CardHeader className="border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <Scissors className="w-5 h-5" />
                Batch Background Removal
              </CardTitle>
              <CardDescription className="text-slate-400">
                Remove backgrounds from the first image of selected vehicles
              </CardDescription>
            </div>
            <Button
              onClick={onClose}
              variant="outline"
              className="border-slate-600 text-white hover:bg-slate-800"
            >
              Close
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={selectAll}
                variant="outline"
                size="sm"
                className="border-slate-600 text-white hover:bg-slate-800"
              >
                Select All ({vehiclesWithImages.length})
              </Button>
              <Button
                onClick={clearSelection}
                variant="outline"
                size="sm"
                className="border-slate-600 text-white hover:bg-slate-800"
              >
                Clear Selection
              </Button>
            </div>
            <Badge variant="secondary" className="bg-slate-800 text-white">
              {selectedVehicles.size} selected
            </Badge>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-white">
                <span>{currentOperation}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Vehicle List */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {vehiclesWithImages.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center space-x-3 p-3 bg-slate-800 rounded-lg hover:bg-slate-750 transition-colors"
              >
                <Checkbox
                  checked={selectedVehicles.has(vehicle.stockNumber)}
                  onCheckedChange={() => toggleVehicleSelection(vehicle.stockNumber)}
                  className="border-slate-600"
                />
                
                <div className="w-16 h-12 rounded overflow-hidden bg-slate-700">
                  {vehicle.images?.[0] ? (
                    <img
                      src={`/api/proxy-image?url=${encodeURIComponent(vehicle.images[0])}`}
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to placeholder on error
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h4 className="text-white font-medium">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Stock #{vehicle.stockNumber} • {vehicle.images?.length || 0} images
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {getResultIcon(vehicle.stockNumber)}
                  {results[vehicle.stockNumber] && (
                    <Badge
                      variant={results[vehicle.stockNumber].status === 'completed' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {results[vehicle.stockNumber].status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <div className="text-sm text-slate-400">
              Processing will remove backgrounds from the first image of each selected vehicle
            </div>
            <Button
              onClick={processBatch}
              disabled={selectedVehicles.size === 0 || isProcessing}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Scissors className="w-4 h-4 mr-2" />
                  Process {selectedVehicles.size} Vehicles
                </>
              )}
            </Button>
          </div>

          {/* Results Summary */}
          {Object.keys(results).length > 0 && (
            <div className="pt-4 border-t border-slate-700">
              <h4 className="text-white font-medium mb-2">Processing Results</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-3">
                  <div className="text-green-400 font-bold text-lg">
                    {Object.values(results).filter((r: any) => r.status === 'completed').length}
                  </div>
                  <div className="text-green-300 text-sm">Completed</div>
                </div>
                <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                  <div className="text-red-400 font-bold text-lg">
                    {Object.values(results).filter((r: any) => r.status === 'failed').length}
                  </div>
                  <div className="text-red-300 text-sm">Failed</div>
                </div>
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-3">
                  <div className="text-blue-400 font-bold text-lg">
                    {Object.keys(results).length}
                  </div>
                  <div className="text-blue-300 text-sm">Total</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}