'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { removeBackground, simpleBackgroundRemoval } from '@/utils/removeBackground';
import { Loader2, Upload, Download, AlertCircle } from 'lucide-react';

export default function BackgroundRemovalTestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingMethod, setProcessingMethod] = useState<'main' | 'fallback' | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setProcessedImage(null);
      setError(null);
      setProcessingMethod(null);
    }
  };

  const handleBackgroundRemoval = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setProcessingMethod(null);

    try {
      let processedBlob: Blob;
      
      // Try main method first
      try {
        setProcessingMethod('main');
        processedBlob = await removeBackground(selectedFile);
      } catch (mainError) {
        console.warn('Main background removal failed, trying fallback:', mainError);
        
        // Try fallback method
        try {
          setProcessingMethod('fallback');
          processedBlob = await simpleBackgroundRemoval(selectedFile);
        } catch (fallbackError) {
          console.error('Both methods failed:', fallbackError);
          throw new Error('All background removal methods failed. Please try with a different image.');
        }
      }
      
      const url = URL.createObjectURL(processedBlob);
      setProcessedImage(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Background removal failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadProcessedImage = () => {
    if (processedImage) {
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = `processed_${selectedFile?.name || 'image'}.png`;
      link.click();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Background Removal Test</CardTitle>
          <CardDescription className="text-white/70">
            Test the background removal functionality with your own images
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File Upload */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Select Image
              </label>
              {selectedFile && (
                <span className="text-white text-sm">
                  Selected: {selectedFile.name}
                </span>
              )}
            </div>

            {selectedFile && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-white text-lg mb-2">Original Image</h3>
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Original"
                    className="w-full h-64 object-cover rounded border border-white/20"
                  />
                </div>
                <div>
                  <h3 className="text-white text-lg mb-2">Processed Image</h3>
                  {processedImage ? (
                    <div className="relative">
                      <img
                        src={processedImage}
                        alt="Processed"
                        className="w-full h-64 object-cover rounded border border-white/20"
                      />
                      <Button
                        onClick={downloadProcessedImage}
                        className="absolute bottom-2 right-2 bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full h-64 bg-white/10 rounded border border-white/20 flex items-center justify-center">
                      <span className="text-white/50">Processed image will appear here</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Process Button */}
          {selectedFile && !processedImage && (
            <Button
              onClick={handleBackgroundRemoval}
              disabled={isProcessing}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {processingMethod === 'main' ? 'Processing with AI...' : 
                   processingMethod === 'fallback' ? 'Processing with fallback...' : 
                   'Processing...'}
                </>
              ) : (
                'Remove Background'
              )}
            </Button>
          )}

          {/* Processing Method Indicator */}
          {processingMethod && (
            <div className={`p-3 rounded border ${
              processingMethod === 'main' 
                ? 'bg-blue-500/20 border-blue-500/30' 
                : 'bg-yellow-500/20 border-yellow-500/30'
            }`}>
              <div className="flex items-center gap-2">
                {processingMethod === 'main' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-300" />
                    <span className="text-blue-300 text-sm">
                      Using AI-powered background removal...
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-300" />
                    <span className="text-yellow-300 text-sm">
                      Using fallback background removal method...
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded">
              <p className="text-red-300 text-sm">Error: {error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded">
            <h3 className="text-blue-300 text-lg mb-2">Instructions</h3>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Select an image file (JPEG, PNG, or WebP)</li>
              <li>• Click "Remove Background" to process the image</li>
              <li>• The system will try AI-powered removal first, then fallback to simple method</li>
              <li>• Wait for processing to complete</li>
              <li>• Download the processed image when ready</li>
              <li>• If processing fails, try with a different image or check the console for errors</li>
            </ul>
          </div>

          {/* Method Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-500/20 border border-green-500/30 rounded">
              <h4 className="text-green-300 text-lg mb-2">AI Method</h4>
              <p className="text-green-200 text-sm">
                Uses advanced AI models for high-quality background removal. Best results but requires more processing power.
              </p>
            </div>
            <div className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded">
              <h4 className="text-yellow-300 text-lg mb-2">Fallback Method</h4>
              <p className="text-yellow-200 text-sm">
                Simple canvas-based processing that removes light/white backgrounds. Works on all browsers but less sophisticated.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
