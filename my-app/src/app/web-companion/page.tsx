'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Car,
  Search,
  Grid,
  List,
  Heart,
  Share2,
  Check,
  Eye,
  Calendar,
  Sparkles,
  Plus,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { MediaCarousel } from '@/components/MediaCarousel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface ProcessedImage {
  processedUrl: string;
  processedAt: string;
  status: 'completed' | 'failed';
}

interface VehicleInfo {
  id: string;
  stockNumber: string;
  year?: number;
  make?: string;
  model?: string;
  price?: number;
  mileage?: number;
  engine?: string;
}

interface GalleryItem {
  stockNumber: string;
  images: ProcessedImage[];
  vehicleInfo?: VehicleInfo;
  processedAt: string; // For sorting
}

export default function WebCompanionGallery() {
  const router = useRouter();
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'make'>('newest');
  const [selectedMake, setSelectedMake] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  // Selection State
  const [selectedStocks, setSelectedStocks] = useState<Set<string>>(new Set());
  
  // New Session Modal State
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [newStockNumber, setNewStockNumber] = useState('');

  useEffect(() => {
    fetchGallery();
  }, []);

  const fetchGallery = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/processed-images/all');
      const data = await res.json();
      
      if (data.success && data.processedImages) {
        const items: GalleryItem[] = Object.entries(data.processedImages).map(([stock, imgs]: [string, any]) => {
          const firstImg = imgs[0];
          return {
            stockNumber: stock,
            images: imgs,
            vehicleInfo: firstImg?.vehicleInfo,
            processedAt: firstImg?.processedAt || new Date().toISOString()
          };
        });
        
        // Default sort: newest processed first
        items.sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
        setGalleryItems(items);
      }
    } catch (error) {
      console.error('Failed to load gallery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = () => {
    const trimmed = newStockNumber.trim();
    if (!trimmed) return;
    router.push(`/web-companion/${encodeURIComponent(trimmed)}`);
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyShareLink = async (stockNumber: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const link = `${window.location.origin}/web-companion/${stockNumber}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(stockNumber);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };
  
  const toggleSelection = (stockNumber: string) => {
    setSelectedStocks(prev => {
      const next = new Set(prev);
      if (next.has(stockNumber)) next.delete(stockNumber);
      else next.add(stockNumber);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStocks.size === filteredItems.length) {
      setSelectedStocks(new Set());
    } else {
      setSelectedStocks(new Set(filteredItems.map(item => item.stockNumber)));
    }
  };
  
  const handleBatchAddToBackground = () => {
    if (selectedStocks.size === 0) return;
    const stocks = Array.from(selectedStocks).join(',');
    // Redirect to content-creation with batch parameter
    router.push(`/content-creation?batch=${encodeURIComponent(stocks)}`);
  };

  const filteredItems = galleryItems
    .filter(item => {
      const term = searchTerm.toLowerCase();
      const stock = item.stockNumber.toLowerCase();
      const make = item.vehicleInfo?.make?.toLowerCase() || '';
      const model = item.vehicleInfo?.model?.toLowerCase() || '';
      const year = item.vehicleInfo?.year?.toString() || '';
      
      return stock.includes(term) || make.includes(term) || model.includes(term) || year.includes(term);
    })
    .filter(item => !selectedMake || item.vehicleInfo?.make === selectedMake)
    .sort((a, b) => {
      if (sortBy === 'make') {
        const makeA = a.vehicleInfo?.make || '';
        const makeB = b.vehicleInfo?.make || '';
        return makeA.localeCompare(makeB);
      }
      return new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime();
    });

  const makes = [...new Set(galleryItems.map(item => item.vehicleInfo?.make).filter(Boolean) as string[])];

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center animate-pulse">
           <div className="w-16 h-16 mx-auto mb-4 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center">
            <Car className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Loading Gallery</h2>
          <p className="text-muted-foreground">Syncing processed assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="relative z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-secondary text-secondary-foreground rounded-xl flex items-center justify-center">
                 <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Web Companion Gallery</h1>
                <p className="text-muted-foreground">Processed Inventory & Marketing Assets</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="rounded-lg px-3 py-2 border hidden sm:block">
                <span className="text-sm text-muted-foreground">
                  {filteredItems.length} sessions
                </span>
              </div>
              <Button
                onClick={() => setIsNewSessionOpen(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Session
              </Button>
              <Button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                variant="outline"
                size="icon"
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex-1 relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by make, model, year, or stock #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 w-full lg:w-auto">
               <select
                 value={selectedMake}
                 onChange={(e) => setSelectedMake(e.target.value)}
                 className="border rounded-lg px-3 py-2 bg-background min-w-[150px] flex-1 lg:flex-none"
               >
                 <option value="">All Makes</option>
                 {makes.map((make) => (
                   <option key={make} value={make}>{make}</option>
                 ))}
               </select>

               <select
                 value={sortBy}
                 onChange={(e) => setSortBy(e.target.value as 'newest' | 'make')}
                 className="border rounded-lg px-3 py-2 bg-background min-w-[150px] flex-1 lg:flex-none"
               >
                 <option value="newest">Newest First</option>
                 <option value="make">Make: A to Z</option>
               </select>
               
               {filteredItems.length > 0 && (
                  <Button 
                     variant="outline" 
                     onClick={toggleSelectAll}
                     className={selectedStocks.size > 0 ? "bg-accent/20 border-accent" : ""}
                     title={selectedStocks.size === filteredItems.length ? "Deselect All" : "Select All"}
                  >
                     {selectedStocks.size === filteredItems.length ? (
                        <CheckSquare className="w-4 h-4" />
                     ) : (
                        <Square className="w-4 h-4" />
                     )}
                  </Button>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {filteredItems.length === 0 && (
          <div className="text-center py-20 bg-muted/10 rounded-xl border-2 border-dashed border-border/50">
             <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
             <h3 className="text-xl font-semibold mb-2">No Sessions Found</h3>
             <p className="text-muted-foreground mb-6">
                {searchTerm ? 'Try adjusting your filters.' : 'Start a new capture session to see it here.'}
             </p>
             {!searchTerm && (
               <Button onClick={() => setIsNewSessionOpen(true)}>Start Session</Button>
             )}
          </div>
        )}

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item, index) => (
              <Card
                key={item.stockNumber}
                className={`overflow-hidden transition-all duration-300 group hover:shadow-lg border-2 ${selectedStocks.has(item.stockNumber) ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => toggleSelection(item.stockNumber)}
              >
                <div className="relative">
                  <div className="aspect-[4/3] bg-muted relative">
                     {item.images.length > 0 ? (
                        <MediaCarousel
                          images={item.images.slice(0, 5).map(img => ({
                             url: img.processedUrl,
                             alt: `${item.stockNumber} processed asset`
                          }))}
                        />
                     ) : (
                        <div className="flex items-center justify-center h-full">
                           <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                     )}
                     
                     {/* Selection Overlay */}
                     <div className="absolute top-2 left-2 z-20">
                        <Checkbox 
                           checked={selectedStocks.has(item.stockNumber)}
                           onCheckedChange={() => toggleSelection(item.stockNumber)}
                           className="bg-background/80 backdrop-blur w-5 h-5 border-2 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                        />
                     </div>
                     
                     {/* Overlay Controls */}
                     <div className="absolute top-3 right-3 flex space-x-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          onClick={(e) => toggleFavorite(item.stockNumber, e)}
                          className={`w-8 h-8 rounded-full border-0 ${
                            favorites.has(item.stockNumber)
                              ? "bg-red-500/80 hover:bg-red-600"
                              : "bg-black/50 hover:bg-black/70"
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${favorites.has(item.stockNumber) ? "fill-current" : ""}`} />
                        </Button>
                        <Button
                          size="icon"
                          onClick={(e) => copyShareLink(item.stockNumber, e)}
                          className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 border-0"
                        >
                          {copiedLink === item.stockNumber ? (
                             <Check className="w-4 h-4 text-green-400" />
                          ) : (
                             <Share2 className="w-4 h-4" />
                          )}
                        </Button>
                     </div>
                     
                     <div className="absolute bottom-2 right-2 z-10">
                        <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-md text-xs">
                           {item.images.length} Assets
                        </Badge>
                     </div>
                  </div>
                </div>

                <div className="p-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg truncate pr-2">
                      {item.vehicleInfo?.year 
                        ? `${item.vehicleInfo.year} ${item.vehicleInfo.make}`
                        : `Stock #${item.stockNumber}`
                      }
                    </h3>
                  </div>

                  <p className="text-muted-foreground text-sm mb-3 truncate">
                     {item.vehicleInfo?.model || 'Unknown Model'}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                     <span className="text-primary font-bold text-lg">
                        {item.vehicleInfo?.price ? `$${item.vehicleInfo.price.toLocaleString()}` : <span className="text-sm font-normal text-muted-foreground">Not Priced</span>}
                     </span>
                     <span className="text-muted-foreground text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                        #{item.stockNumber}
                     </span>
                  </div>

                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={() => router.push(`/web-companion/${encodeURIComponent(item.stockNumber)}`)}
                    >
                       <Eye className="w-3 h-3 mr-2" />
                       View Session
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => router.push(`/content-creation?stockNumber=${encodeURIComponent(item.stockNumber)}`)}
                    >
                       <Sparkles className="w-3 h-3 mr-2 text-blue-500" />
                       Add to Background
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item, index) => (
               <Card 
                  key={item.stockNumber} 
                  className={`flex flex-col sm:flex-row overflow-hidden hover:shadow-md transition-all cursor-pointer border-2 ${selectedStocks.has(item.stockNumber) ? 'border-primary bg-accent/5' : 'border-border'}`}
                  onClick={() => toggleSelection(item.stockNumber)}
               >
                  <div className="w-full sm:w-48 aspect-video sm:aspect-auto relative bg-muted group">
                      {item.images.length > 0 && (
                        <Image 
                           src={item.images[0].processedUrl} 
                           alt="Thumbnail" 
                           fill 
                           className="object-cover"
                        />
                      )}
                      <div className="absolute top-2 left-2 z-20">
                        <Checkbox 
                           checked={selectedStocks.has(item.stockNumber)}
                           onCheckedChange={() => toggleSelection(item.stockNumber)}
                           className="bg-background/80 backdrop-blur"
                        />
                     </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-center" onClick={(e) => e.stopPropagation()}>
                     <div className="flex justify-between items-start mb-2">
                        <div>
                           <h3 className="font-bold text-xl">
                              {item.vehicleInfo?.year ? `${item.vehicleInfo.year} ${item.vehicleInfo.make} ${item.vehicleInfo.model}` : item.stockNumber}
                           </h3>
                           <p className="text-muted-foreground text-sm">Stock: {item.stockNumber}</p>
                        </div>
                        <div className="text-right">
                           <p className="font-bold text-lg text-primary">
                              {item.vehicleInfo?.price ? `$${item.vehicleInfo.price.toLocaleString()}` : 'N/A'}
                           </p>
                           <p className="text-xs text-muted-foreground">{item.images.length} processed images</p>
                        </div>
                     </div>
                     <div className="flex gap-2 mt-2">
                        <Button size="sm" onClick={() => router.push(`/web-companion/${encodeURIComponent(item.stockNumber)}`)}>
                           View Session
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => router.push(`/content-creation?stockNumber=${encodeURIComponent(item.stockNumber)}`)}>
                           Add to Background
                        </Button>
                     </div>
                  </div>
               </Card>
            ))}
          </div>
        )}
      </div>

      {/* Floating Batch Action Bar */}
      {selectedStocks.size > 0 && (
         <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-foreground text-background px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 border border-white/20">
               <span className="font-semibold text-sm whitespace-nowrap">
                  {selectedStocks.size} vehicle{selectedStocks.size !== 1 ? 's' : ''} selected
               </span>
               <div className="h-4 w-px bg-background/20"></div>
               <div className="flex gap-2">
                  <Button 
                     size="sm" 
                     className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
                     onClick={handleBatchAddToBackground}
                  >
                     <Layers className="w-4 h-4 mr-2" />
                     Add to Background
                  </Button>
                  <Button 
                     size="sm" 
                     variant="secondary"
                     className="rounded-full bg-background/20 hover:bg-background/30 text-background border-none"
                     onClick={() => setSelectedStocks(new Set())}
                  >
                     Cancel
                  </Button>
               </div>
            </div>
         </div>
      )}

      <Dialog open={isNewSessionOpen} onOpenChange={setIsNewSessionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Session</DialogTitle>
            <DialogDescription>
              Enter a stock number to begin capturing and processing images.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newStock" className="mb-2 block">Stock Number</Label>
            <Input
               id="newStock" 
               placeholder="e.g. 24-8851"
               value={newStockNumber}
               onChange={(e) => setNewStockNumber(e.target.value.toUpperCase())}
               onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewSessionOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSession} disabled={!newStockNumber.trim()}>
               Start Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
