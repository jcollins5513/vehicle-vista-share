'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  Search,
  Loader2,
  FolderOpen,
  Plus
} from 'lucide-react';
import { DragAndDropUpload } from './DragAndDropUpload';
import Image from 'next/image';

interface Asset {
  key: string;
  url: string;
  fileName: string;
  category: string;
  lastModified?: Date;
  size?: number;
}

interface AssetManagerProps {
  onAssetSelect?: (asset: Asset) => void;
  selectedAsset?: Asset | null;
}

export function AssetManager({ onAssetSelect, selectedAsset }: AssetManagerProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [uploadCategory, setUploadCategory] = useState('manual-uploads');

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assets');
      const data = await response.json();
      
      if (data.success) {
        setAssets(data.assets);
        if (data.warning) {
          console.log('Assets API warning:', data.warning);
        }
      } else {
        console.error('Failed to fetch assets:', data.error);
        // Don't show error for bucket not found - it's expected initially
        if (!data.error?.includes('NoSuchBucket') && !data.error?.includes('does not exist')) {
          alert(`Failed to load assets: ${data.error}`);
        }
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      // Only show error if it's not a bucket issue
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.includes('NoSuchBucket') && !errorMessage.includes('does not exist')) {
        alert(`Error loading assets: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleFileUpload = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', uploadCategory);

      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchAssets(); // Refresh the list
        // Reset the input
        event.target.value = '';
      } else {
        alert(`Upload failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAsset = async (asset: Asset) => {
    if (!confirm(`Are you sure you want to delete "${asset.fileName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/assets?key=${encodeURIComponent(asset.key)}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchAssets(); // Refresh the list
      } else {
        alert(`Delete failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Delete failed. Please try again.');
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(assets.map(asset => asset.category)))];

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Debug Section - only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 backdrop-blur-xl border-yellow-500/20">
          <CardHeader>
            <CardTitle className="text-yellow-200 text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-yellow-100 text-xs space-y-1">
              <p>Assets loaded: {assets.length}</p>
              <p>Loading: {loading ? 'Yes' : 'No'}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/assets/test');
                    const data = await response.json();
                    console.log('S3 Test Results:', data);
                    alert('Check console for S3 test results');
                  } catch (error) {
                    console.error('S3 test failed:', error);
                    alert('S3 test failed - check console');
                  }
                }}
                className="bg-yellow-500/20 border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/30"
              >
                Test S3 Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Section */}
      <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Upload Assets
          </CardTitle>
          <CardDescription className="text-white/70">
            Upload images to use in your content templates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category" className="text-white text-sm font-medium">
                Category
              </Label>
              <Input
                id="category"
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                placeholder="e.g., backgrounds, logos, templates"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder-white/50"
              />
            </div>
            <div>
              <Label className="text-white text-sm font-medium">
                Upload Asset
              </Label>
              <DragAndDropUpload
                onFilesDrop={handleFileUpload}
                multiple={false}
                accept="image/*"
                disabled={uploading}
                isUploading={uploading}
                uploadText="Click to upload or drag & drop here"
                uploadSubtext="Supports JPG, PNG, WebP files"
                className="mt-1"
              />
            </div>
          </div>
          {uploading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-white mr-2" />
              <span className="text-white">Uploading...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asset Browser */}
      <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <FolderOpen className="w-5 h-5 mr-2" />
            Asset Library
          </CardTitle>
          <CardDescription className="text-white/70">
            Browse and manage your uploaded assets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                <Input
                  placeholder="Search assets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/50"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={selectedCategory === category 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "bg-white/10 border-white/20 text-white hover:bg-white/20"
                  }
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Asset Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
              <span className="text-white ml-2">Loading assets...</span>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-white/30" />
              <h3 className="text-white text-lg font-medium mb-2">No Assets Found</h3>
              <p className="text-white/70">
                {assets.length === 0 
                  ? "Upload your first asset to get started" 
                  : "No assets match your current filters"
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredAssets.map((asset) => (
                <div
                  key={asset.key}
                  className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                    selectedAsset?.key === asset.key 
                      ? 'border-blue-500 ring-2 ring-blue-500/50' 
                      : 'border-white/20 hover:border-white/40'
                  }`}
                  onClick={() => onAssetSelect?.(asset)}
                >
                  <div className="aspect-square bg-white/5">
                    <Image
                      src={asset.url}
                      alt={asset.fileName}
                      width={200}
                      height={200}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(asset.url, '_blank');
                        }}
                        className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAsset(asset);
                        }}
                        className="bg-red-500/20 border-red-500/30 text-red-200 hover:bg-red-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Asset info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2">
                    <p className="text-white text-xs font-medium truncate">
                      {asset.fileName}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {asset.category}
                      </Badge>
                      <span className="text-white/70 text-xs">
                        {formatFileSize(asset.size)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}