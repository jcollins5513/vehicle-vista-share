"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  Download, 
  Image as ImageIcon, 
  Loader2, 
  Sparkles,
  Zap,
  Server,
  Monitor,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import Image from 'next/image';

interface ProcessingResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  processingTime?: number;
  method: 'browser' | 'server';
}

export default function BackgroundRemovalTestPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [browserResult, setBrowserResult] = useState<ProcessingResult | null>(null);
  const [serverResult, setServerResult] = useState<ProcessingResult | null>(null);
  const [isProcessingBrowser, setIsProcessingBrowser] = useState(false);
  const [isProcessingServer, setIsProcessingServer] = useState(false);
  const [activeTab, setActiveTab] = useState('compare');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setBrowserResult(null);
      setServerResult(null);
    }
  };

  const processWithBrowser = async () => {
    if (!selectedFile) return;

    setIsProcessingBrowser(true);
    const startTime = Date.now();

    try {
      // Convert file to base64
      const base64 = await fileToBase64(selectedFile);
      
      // Use @imgly/background-removal
      const { removeBackground } = await import('@imgly/background-removal');
      
      const result = await removeBackground(base64, {
        output: {
          format: 'image/png',
          quality: 0.8
        }
      });

      const processingTime = Date.now() - startTime;
      
      console.log('Background removal result:', result);
      console.log('Result type:', typeof result);
      console.log('Result constructor:', result?.constructor?.name);
      
      // The result should be a data URL or blob URL
      let imageUrl: string;
      if (typeof result === 'string') {
        imageUrl = result;
      } else if (result instanceof Blob) {
        imageUrl = URL.createObjectURL(result);
      } else {
        console.error('Unexpected result format:', result);
        throw new Error('Unexpected result format from background removal');
      }
      
      setBrowserResult({
        success: true,
        imageUrl,
        processingTime,
        method: 'browser'
      });
    } catch (error) {
      console.error('Browser processing error:', error);
      setBrowserResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        method: 'browser'
      });
    } finally {
      setIsProcessingBrowser(false);
    }
  };

  const processWithServer = async () => {
    if (!selectedFile) return;

    setIsProcessingServer(true);
    const startTime = Date.now();

    try {
      // Convert file to base64 for API call
      const base64 = await fileToBase64(selectedFile);
      
      const response = await fetch('/api/background-removal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: base64,
          stockNumber: 'test',
          imageIndex: 0
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const processingTime = Date.now() - startTime;

      if (data.success) {
        setServerResult({
          success: true,
          imageUrl: data.processedUrl,
          processingTime,
          method: 'server'
        });
      } else {
        throw new Error(data.error || 'Server processing failed');
      }
    } catch (error) {
      console.error('Server processing error:', error);
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorMessage = 'API endpoint not available. Make sure the background-removal API is running.';
        } else if (error.message.includes('HTTP error')) {
          errorMessage = `Server error: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
      }
      
      setServerResult({
        success: false,
        error: errorMessage,
        method: 'server'
      });
    } finally {
      setIsProcessingServer(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const downloadImage = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetTest = () => {
    // Clean up any object URLs to prevent memory leaks
    if (browserResult?.imageUrl && browserResult.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(browserResult.imageUrl);
    }
    if (serverResult?.imageUrl && serverResult.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(serverResult.imageUrl);
    }
    
    setSelectedFile(null);
    setPreviewUrl(null);
    setBrowserResult(null);
    setServerResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-black/40 to-black/20 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-white text-3xl font-bold bg-gradient-to-r from-white via-yellow-100 to-blue-100 bg-clip-text text-transparent">
                Background Removal Test
              </h1>
              <p className="text-white/70">
                Compare browser-based vs server-based background removal
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white/10 backdrop-blur-xl border border-white/20">
            <TabsTrigger value="compare" className="data-[state=active]:bg-white/20 text-white">
              <Zap className="w-4 h-4 mr-2" />
              Compare Methods
            </TabsTrigger>
            <TabsTrigger value="info" className="data-[state=active]:bg-white/20 text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Method Details
            </TabsTrigger>
          </TabsList>

          {/* Compare Methods Tab */}
          <TabsContent value="compare" className="space-y-6">
            {/* File Upload */}
            <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Test Image
                </CardTitle>
                <CardDescription className="text-white/70">
                  Select an image to test both background removal methods
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="bg-white/10 border-white/20 text-white file:bg-white/20 file:text-white file:border-white/30"
                  />
                  <Button
                    onClick={resetTest}
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10"
                  >
                    Reset
                  </Button>
                </div>

                {previewUrl && (
                  <div className="mt-4">
                    <h4 className="text-white font-medium mb-2">Preview:</h4>
                    <div className="relative w-64 h-48 rounded-lg overflow-hidden border border-white/20">
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Processing Controls */}
            {selectedFile && (
              <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">Process Image</CardTitle>
                  <CardDescription className="text-white/70">
                    Choose which method to test, or test both for comparison
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={processWithBrowser}
                      disabled={isProcessingBrowser}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {isProcessingBrowser ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Monitor className="w-4 h-4 mr-2" />
                      )}
                      {isProcessingBrowser ? 'Processing...' : 'Browser Method'}
                    </Button>

                                         <Button
                       onClick={processWithServer}
                       disabled={isProcessingServer}
                       className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                     >
                       {isProcessingServer ? (
                         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                       ) : (
                         <Server className="w-4 h-4 mr-2" />
                       )}
                       {isProcessingServer ? 'Processing...' : 'Server Method'}
                     </Button>
                     <p className="text-xs text-white/50 mt-2">
                       Requires background-removal API to be running
                     </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Results Comparison */}
            {(browserResult || serverResult) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Browser Result */}
                <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Monitor className="w-5 h-5 mr-2" />
                      Browser Method
                    </CardTitle>
                    <CardDescription className="text-white/70">
                      @imgly/background-removal
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {browserResult ? (
                      <div className="space-y-4">
                        {browserResult.success ? (
                          <>
                            <div className="relative w-full h-64 rounded-lg overflow-hidden border border-white/20">
                              {browserResult.imageUrl && (
                                <Image
                                  src={browserResult.imageUrl}
                                  alt="Browser processed"
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div className="flex items-center justify-between text-sm text-white/70">
                              <span>Processing time: {browserResult.processingTime}ms</span>
                              {browserResult.imageUrl && (
                                <Button
                                  onClick={() => downloadImage(browserResult.imageUrl!, 'browser-processed.png')}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                            <p className="text-red-300 font-medium">Processing Failed</p>
                            <p className="text-red-200 text-sm mt-2">{browserResult.error}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ImageIcon className="w-16 h-16 text-white/30 mx-auto mb-4" />
                        <p className="text-white/50">Click "Browser Method" to test</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Server Result */}
                <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Server className="w-5 h-5 mr-2" />
                      Server Method
                    </CardTitle>
                    <CardDescription className="text-white/70">
                      Python backgroundremover
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {serverResult ? (
                      <div className="space-y-4">
                        {serverResult.success ? (
                          <>
                            <div className="relative w-full h-64 rounded-lg overflow-hidden border border-white/20">
                              {serverResult.imageUrl && (
                                <Image
                                  src={serverResult.imageUrl}
                                  alt="Server processed"
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div className="flex items-center justify-between text-sm text-white/70">
                              <span>Processing time: {serverResult.processingTime}ms</span>
                              {serverResult.imageUrl && (
                                <Button
                                  onClick={() => downloadImage(serverResult.imageUrl!, 'server-processed.png')}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </Button>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                            <p className="text-red-300 font-medium">Processing Failed</p>
                            <p className="text-red-200 text-sm mt-2">{serverResult.error}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ImageIcon className="w-16 h-16 text-white/30 mx-auto mb-4" />
                        <p className="text-white/50">Click "Server Method" to test</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Method Details Tab */}
          <TabsContent value="info" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Browser Method Info */}
              <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Monitor className="w-5 h-5 mr-2" />
                    Browser Method
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    @imgly/background-removal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white">No server dependencies</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white">Vercel production ready</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white">Real-time processing</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white">Scalable architecture</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-white">Limited by browser memory</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-white">Uses client resources</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/20">
                    <h4 className="text-white font-medium mb-2">Best for:</h4>
                    <ul className="text-white/70 text-sm space-y-1">
                      <li>• Production Vercel deployments</li>
                      <li>• Real-time user interactions</li>
                      <li>• Small to medium images</li>
                      <li>• High-traffic applications</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Server Method Info */}
              <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <Server className="w-5 h-5 mr-2" />
                    Server Method
                  </CardTitle>
                  <CardDescription className="text-white/70">
                    Python backgroundremover
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white">More powerful processing</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white">Handles large images</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white">Consistent results</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-white">Batch processing</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-white">Server dependencies</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4 text-red-400" />
                      <span className="text-white">Vercel limitations</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-white/20">
                    <h4 className="text-white font-medium mb-2">Best for:</h4>
                    <ul className="text-white/70 text-sm space-y-1">
                      <li>• Development/testing</li>
                      <li>• Large image processing</li>
                      <li>• Batch operations</li>
                      <li>• Dedicated servers</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendation */}
            <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-xl border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/90 leading-relaxed">
                  For your Vercel-hosted production application, we recommend using the <strong>browser method</strong> 
                  (@imgly/background-removal). It provides a better user experience, eliminates server dependencies, 
                  and scales automatically with your user base. The server method is great for development and testing, 
                  but the browser method is production-ready and more suitable for Vercel's serverless architecture.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
