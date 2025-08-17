'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, Image, CheckCircle, XCircle, Play } from 'lucide-react';

interface ProcessedImage {
  originalUrl: string;
  processedUrl: string;
  processedAt: Date;
  status: 'processing' | 'completed' | 'failed';
}

interface ProcessingResult {
  [stockNumber: string]: ProcessedImage[];
}

export function BackgroundRemovalPanel() {
  const [stockNumber, setStockNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ProcessingResult>({});
  const [progress, setProgress] = useState(0);
  const [currentOperation, setCurrentOperation] = useState('');

  const processVehicle = async (stockNumber?: string) => {
    setIsProcessing(true);
    setProgress(0);
    setCurrentOperation(stockNumber ? `Processing vehicle ${stockNumber}...` : 'Processing all vehicles...');

    try {
      const response = await fetch('/api/background-removal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stockNumber: stockNumber || undefined,
          processAll: !stockNumber,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResults(data.results);
        setProgress(100);
        setCurrentOperation('Processing completed!');
      } else {
        throw new Error(data.message || 'Processing failed');
      }
    } catch (error) {
      console.error('Error processing images:', error);
      setCurrentOperation(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessSingle = () => {
    if (stockNumber.trim()) {
      processVehicle(stockNumber.trim());
    }
  };

  const handleProcessAll = () => {
    processVehicle();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Image className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      processing: 'secondary',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Background Removal Service
          </CardTitle>
          <CardDescription>
            Remove backgrounds from vehicle photos using AI-powered background removal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single Vehicle Processing */}
          <div className="space-y-2">
            <Label htmlFor="stockNumber">Process Single Vehicle</Label>
            <div className="flex gap-2">
              <Input
                id="stockNumber"
                placeholder="Enter stock number (e.g., S161)"
                value={stockNumber}
                onChange={(e) => setStockNumber(e.target.value)}
                disabled={isProcessing}
              />
              <Button 
                onClick={handleProcessSingle} 
                disabled={isProcessing || !stockNumber.trim()}
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Process
              </Button>
            </div>
          </div>

          {/* Process All Vehicles */}
          <div className="space-y-2">
            <Label>Process All Vehicles</Label>
            <Button 
              onClick={handleProcessAll} 
              disabled={isProcessing}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Process All Vehicle Images
            </Button>
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentOperation}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {Object.keys(results).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processing Results</CardTitle>
            <CardDescription>
              Background removal results for processed vehicles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(results).map(([vehicleStockNumber, images]) => (
                <div key={vehicleStockNumber} className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">Vehicle {vehicleStockNumber}</h3>
                  <div className="grid gap-3">
                    {images.map((image, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(image.status)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              Image {index + 1}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {image.originalUrl}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(image.status)}
                          {image.status === 'completed' && image.processedUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(image.processedUrl, '_blank')}
                            >
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    Processed: {images.filter(img => img.status === 'completed').length} / {images.length} images
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}