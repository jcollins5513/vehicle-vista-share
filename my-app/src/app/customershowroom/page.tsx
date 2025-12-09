"use client";
import React, { useState, useEffect } from "react";
import { getShowroomDataAction } from "@/app/actions"; // Removed .ts extension
import {
  Zap,
  Car,
  Share2,
  Heart,
  Eye,
  Calendar,
  Grid,
  List,
  Search,
  Star,
  Copy,
  Check,
  Phone,
  MessageSquare,
  MapPin,
  Printer,
  Scissors,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import type { VehicleWithMedia } from "@/types";
import WindowSticker from "@/components/WindowSticker";
import BatchPrintModal from "@/components/BatchPrintModal";
import { BackgroundRemovalButton } from "@/components/BackgroundRemovalButton";
import { BatchBackgroundRemoval } from "@/components/BatchBackgroundRemoval";
import { MediaCarousel } from "@/components/MediaCarousel";

export default function CustomerShowroomPage() {
  const [vehicles, setVehicles] = useState<VehicleWithMedia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"price" | "year" | "make">("year");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isBatchPrintModalOpen, setIsBatchPrintModalOpen] = useState(false);
  const [isBatchBgRemovalOpen, setIsBatchBgRemovalOpen] = useState(false);
  const [processingStatuses, setProcessingStatuses] = useState<{ [vehicleId: string]: string }>({});
  const [selectedFilters, setSelectedFilters] = useState({
    make: "",
    priceRange: "",
    year: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { vehicles: fetchedVehicles, error: fetchError } =
          await getShowroomDataAction();
        if (fetchError) {
          setError(fetchError);
        } else {
          setVehicles(fetchedVehicles);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getDisplayPrice = (vehicle: VehicleWithMedia): string => {
    // Prefer Sale Price from pricingDetails
    const pd = vehicle.pricingDetails || {};
    const sale = pd['Sale Price'] || pd['Sale price'] || pd['SALE PRICE'] || pd['SalePrice'];
    if (sale && typeof sale === 'string') {
      return sale.replace(/\s/g, '');
    }
    // Fallback to explicit salePrice field if present
    if (vehicle.salePrice) {
      if (typeof vehicle.salePrice === 'number') return `$${vehicle.salePrice.toLocaleString()}`;
      return vehicle.salePrice;
    }
    // Fallback to base price
    if (typeof vehicle.price === 'number' && vehicle.price > 0) {
      return `$${vehicle.price.toLocaleString()}`;
    }
    return 'Contact for Price';
  };

  const filteredVehicles = vehicles
    .filter(
      (vehicle) =>
        vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.year.toString().includes(searchTerm) ||
        vehicle.stockNumber?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .filter(
      (vehicle) =>
        !selectedFilters.make || vehicle.make === selectedFilters.make,
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "price":
          return (a.price || 0) - (b.price || 0);
        case "year":
          return b.year - a.year;
        case "make":
          return a.make.localeCompare(b.make);
        default:
          return 0;
      }
    });

  const toggleFavorite = (vehicleId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(vehicleId)) {
        newFavorites.delete(vehicleId);
      } else {
        newFavorites.add(vehicleId);
      }
      return newFavorites;
    });
  };

  const copyShareLink = async (vehicle: VehicleWithMedia) => {
    const link = `${window.location.origin}/customer/${vehicle.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(vehicle.id);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedLink(vehicle.id);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  const scheduleViewing = (vehicle: VehicleWithMedia) => {
    alert(
      `Scheduling viewing for ${vehicle.year} ${vehicle.make} ${vehicle.model}. Calendar integration coming soon!`,
    );
  };

  const handleProcessingUpdate = (vehicleId: string, status: string) => {
    setProcessingStatuses(prev => ({
      ...prev,
      [vehicleId]: status
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-accent text-accent-foreground rounded-full flex items-center justify-center animate-pulse">
            <Car className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Loading Premium Collection</h2>
          <p className="text-muted-foreground">Preparing your luxury experience...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
            <Zap className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Service Unavailable</h2>
          <p className="text-muted-foreground mb-4">Error loading vehicles: {error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center">
            <Car className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Collection Coming Soon</h2>
          <p className="text-muted-foreground">
            Our premium vehicles are being prepared for display.
          </p>
        </div>
      </div>
    );
  }

  const makes = [...new Set(vehicles.map((v) => v.make))];

  const getVehicleImages = (vehicle: VehicleWithMedia) => {
    const urls: string[] = [];
    if (Array.isArray(vehicle.media)) {
      urls.push(...vehicle.media.map((m) => m.url).filter(Boolean));
    }
    if (Array.isArray(vehicle.images)) {
      urls.push(...vehicle.images.filter(Boolean));
    }
    return urls.length ? urls : ["/placeholder.svg"];
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="relative z-10 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-secondary text-secondary-foreground rounded-xl flex items-center justify-center">
                <Image
                  src="/Bentley-logo-groups.svg"
                  alt="Bentley Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain filter brightness-0 invert"
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Customer Showroom</h1>
                <p className="text-muted-foreground">Discover Your Perfect Luxury Vehicle</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="rounded-lg px-3 py-2 border">
                <span className="text-sm text-muted-foreground">
                  {filteredVehicles.length} vehicles
                </span>
              </div>
              <Button
                onClick={() => window.open('/content-creation', '_blank')}
                variant="outline"
                title="Content Creation Library"
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setIsBatchBgRemovalOpen(true)}
                variant="outline"
                title="Batch Background Removal"
              >
                <Scissors className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setIsBatchPrintModalOpen(true)}
                variant="outline"
                title="Batch Print"
              >
                <Printer className="w-4 h-4" />
              </Button>
              <Button
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
                variant="outline"
              >
                {viewMode === "grid" ? (
                  <List className="w-4 h-4" />
                ) : (
                  <Grid className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by make, model, year, or stock #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={selectedFilters.make}
              onChange={(e) =>
                setSelectedFilters((prev) => ({
                  ...prev,
                  make: e.target.value,
                }))
              }
              className="border rounded-lg px-3 py-2 bg-background"
            >
              <option value="">All Makes</option>
              {makes.map((make) => (
                <option key={make} value={make}>
                  {make}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "price" | "year" | "make")
              }
              className="border rounded-lg px-3 py-2 bg-background"
            >
              <option value="year">
                Newest First
              </option>
              <option value="price">
                Price: Low to High
              </option>
              <option value="make">
                Make: A to Z
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVehicles.map((vehicle, index) => (
              <Card
                key={vehicle.id}
                className="overflow-hidden transition-all duration-500 group hover:shadow-lg"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative">
                  <MediaCarousel
                    images={getVehicleImages(vehicle).map((url) => ({
                      url,
                      alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                    }))}
                  />

                  {/* Overlay Controls */}
                  <div className="absolute top-3 right-3 flex space-x-2">
                    <Button
                      size="icon"
                      onClick={() => toggleFavorite(vehicle.id)}
                      className={`w-8 h-8 rounded-full border-0 transition-all ${
                        favorites.has(vehicle.id)
                          ? "bg-red-500/80 hover:bg-red-600"
                          : "bg-black/50 hover:bg-black/70"
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${favorites.has(vehicle.id) ? "fill-current" : ""}`}
                      />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => copyShareLink(vehicle)}
                      className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 border-0"
                    >
                      {copiedLink === vehicle.id ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Special Offers Badge */}
                  <div className="absolute top-3 left-3">
                  <Badge className="px-3 py-1 text-xs font-semibold">
                    SPECIAL OFFER
                  </Badge>
                  </div>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">
                      {vehicle.year} {vehicle.make}
                    </h3>
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-3 h-3 text-yellow-400 fill-current"
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-white/80 text-sm mb-3">{vehicle.model}</p>

                  <div className="flex items-center justify-between mb-4">
                      <span className="text-green-400 font-bold text-xl">
                        {getDisplayPrice(vehicle)}
                      </span>
                    <span className="text-white/60 text-sm">
                      Stock #{vehicle.stockNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    <div className="bg-white/10 rounded px-2 py-1">
                      <span className="text-white/60">Miles: </span>
                      <span className="text-white font-medium">
                        {vehicle.mileage?.toLocaleString() || "N/A"}
                      </span>
                    </div>
                    <div className="bg-white/10 rounded px-2 py-1">
                      <span className="text-white/60">Engine: </span>
                      <span className="text-white font-medium">
                        {vehicle.engine || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <Button
                        onClick={() =>
                          window.open(`/customer/${vehicle.id}`, "_blank")
                        }
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                      <Button
                        onClick={() => scheduleViewing(vehicle)}
                        variant="outline"
                        className="flex-1 border-white/30 text-white hover:bg-white/10 text-sm"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Schedule
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <div className="flex-1">
                        <WindowSticker vehicle={vehicle} />
                      </div>
                      <div className="flex-1">
                        <BackgroundRemovalButton 
                          vehicle={vehicle} 
                          onProcessingUpdate={handleProcessingUpdate}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVehicles.map((vehicle, index) => (
              <Card
                key={vehicle.id}
                className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-500 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center p-6">
                  <div className="w-48">
                    <MediaCarousel
                      images={getVehicleImages(vehicle).map((url) => ({
                        url,
                        alt: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
                      }))}
                      className="rounded-lg"
                    />
                  </div>

                  <div className="flex-1">
                     <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white text-xl font-bold">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <div className="flex items-center space-x-3">
                        <Button
                          size="icon"
                          onClick={() => toggleFavorite(vehicle.id)}
                          className={`w-8 h-8 rounded-full border-0 ${
                            favorites.has(vehicle.id)
                              ? "bg-red-500/80 hover:bg-red-600"
                              : "bg-white/10 hover:bg-white/20"
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${favorites.has(vehicle.id) ? "fill-current" : ""}`}
                          />
                        </Button>
                        <Button
                          size="icon"
                          onClick={() => copyShareLink(vehicle)}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border-0"
                        >
                          {copiedLink === vehicle.id ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Share2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-white/60">Price: </span>
                        <span className="text-green-400 font-bold">
                          ${vehicle.price?.toLocaleString() || "Contact"}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/60">Miles: </span>
                        <span className="text-white">
                          {vehicle.mileage?.toLocaleString() || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/60">Stock: </span>
                        <span className="text-white">
                          {vehicle.stockNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/60">Engine: </span>
                        <span className="text-white">
                          {vehicle.engine || "N/A"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() =>
                          window.open(`/vehicles/${vehicle.stockNumber}`, "_blank")
                        }
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <Button
                        onClick={() => scheduleViewing(vehicle)}
                        variant="outline"
                        className="border-white/30 text-white hover:bg-white/10"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Viewing
                      </Button>
                      <Button
                        onClick={() => copyShareLink(vehicle)}
                        variant="outline"
                        className="border-white/30 text-white hover:bg-white/10"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        {copiedLink === vehicle.id
                          ? "Copied!"
                          : "Share Link"}
                      </Button>
                      {vehicle.threeSixtyImageUrl && (
                        <a
                          href={vehicle.threeSixtyImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View 360° Image"
                        >
                          <Button
                            variant="outline"
                            className="border-white/30 text-white hover:bg-white/10"
                          >
                            <Image
                              src="/360.svg"
                              alt="360 View Icon"
                              width={20}
                              height={20}
                              className="mr-2 filter invert"
                            />
                            360° View
                          </Button>
                        </a>
                      )}
                      <WindowSticker vehicle={vehicle} />
                      <div className="w-full sm:w-auto">
                        <BackgroundRemovalButton 
                          vehicle={vehicle} 
                          onProcessingUpdate={handleProcessingUpdate}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Contact Footer */}
      <div className="relative z-10 bg-gradient-to-r from-black/40 to-black/20 backdrop-blur-xl border-t border-white/20 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <Phone className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">Call Us</h3>
              <p className="text-white/70">(555) 123-4567</p>
            </div>
            <div className="text-center">
              <MessageSquare className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">Live Chat</h3>
              <p className="text-white/70">Available 24/7</p>
            </div>
            <div className="text-center">
              <MapPin className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-white font-bold mb-2">Visit Us</h3>
              <p className="text-white/70">Downtown Showroom</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Batch Print Modal */}
      {isBatchPrintModalOpen && (
        <BatchPrintModal
          vehicles={filteredVehicles}
          isOpen={isBatchPrintModalOpen}
          onClose={() => setIsBatchPrintModalOpen(false)}
        />
      )}

      {/* Batch Background Removal Modal */}
      {isBatchBgRemovalOpen && (
        <BatchBackgroundRemoval
          vehicles={filteredVehicles}
          isOpen={isBatchBgRemovalOpen}
          onClose={() => setIsBatchBgRemovalOpen(false)}
        />
      )}
    </div>
  );
}
