"use client";

import React, { useState, useEffect } from "react";
import { getShowroomDataAction } from "@/app/actions";
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
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { HeroImageDialog } from "@/components/magicui/hero-image-dialog";
import type { VehicleWithMedia } from "@/types";
import { useParams, useRouter } from "next/navigation";

export default function CustomerPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;

  const [vehicles, setVehicles] = useState<VehicleWithMedia[]>([]);
  const [selectedVehicle, setSelectedVehicle] =
    useState<VehicleWithMedia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"price" | "year" | "make">("year");
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [copiedLink, setCopiedLink] = useState<number | null>(null);
  const [selectedFilters, setSelectedFilters] = useState({
    make: "",
    priceRange: "",
    year: "",
  });

  const getDisplayPrice = (vehicle: VehicleWithMedia): string => {
    const pd = vehicle.pricingDetails || {};
    const sale = pd["Sale Price"] || pd["Sale price"] || pd["SALE PRICE"] || pd["SalePrice"];
    if (sale && typeof sale === "string") return sale.replace(/\s/g, "");
    if (vehicle.salePrice) {
      return typeof vehicle.salePrice === "number"
        ? `$${vehicle.salePrice.toLocaleString()}`
        : vehicle.salePrice;
    }
    if (typeof vehicle.price === "number" && vehicle.price > 0) {
      return `$${vehicle.price.toLocaleString()}`;
    }
    return "Contact for Price";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { vehicles: fetchedVehicles, error: fetchError } =
          await getShowroomDataAction();
        if (fetchError) {
          setError(fetchError);
        } else {
          setVehicles(fetchedVehicles);
          // Find the selected vehicle by ID
          const vehicle = fetchedVehicles.find((v) => v.id === vehicleId);
          if (vehicle) {
            setSelectedVehicle(vehicle);
          } else {
            setError("Vehicle not found");
          }
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vehicleId]);

  const filteredVehicles = vehicles
    .filter(
      (vehicle) =>
        vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.year.toString().includes(searchTerm),
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

  const toggleFavorite = (vehicleId: number) => {
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
      setCopiedLink(vehicle.id as unknown as number);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedLink(vehicle.id as unknown as number);
      setTimeout(() => setCopiedLink(null), 2000);
    }
  };

  const scheduleViewing = (vehicle: VehicleWithMedia) => {
    alert(
      `Scheduling viewing for ${vehicle.year} ${vehicle.make} ${vehicle.model}. Calendar integration coming soon!`,
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">
            Loading Vehicle Details
          </h2>
          <p className="text-white/70">Preparing your luxury experience...</p>
        </div>
      </div>
    );
  }

  if (error || !selectedVehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950 to-slate-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">
            Vehicle Not Found
          </h2>
          <p className="text-white/70 mb-4">
            Error: {error || "Vehicle not available"}
          </p>
          <Button
            onClick={() => router.push("/customershowroom")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Browse All Vehicles
          </Button>
        </div>
      </div>
    );
  }

  const vehicleImages =
    selectedVehicle.images?.filter((img) => img && img.trim() !== "") || [];
  const makes = [...new Set(vehicles.map((v) => v.make))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Featured Vehicle Section */}
      <div className="relative z-10 bg-gradient-to-r from-black/40 to-black/20 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <Button
              onClick={() => router.push("/customershowroom")}
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Showroom
            </Button>
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => copyShareLink(selectedVehicle)}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                {copiedLink === Number(selectedVehicle.id) ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Vehicle
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Featured Vehicle Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Hero Image with Dialog */}
            <div className="space-y-4">
              {vehicleImages.length > 0 ? (
                <HeroImageDialog
                  images={vehicleImages}
                  thumbnailSrc={vehicleImages[0]}
                  thumbnailAlt={`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`}
                  vehicleTitle={`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`}
                  className="w-full"
                />
              ) : (
                <div className="aspect-video bg-white/10 rounded-lg flex items-center justify-center">
                  <Car className="w-16 h-16 text-white/50" />
                </div>
              )}
            </div>

            {/* Vehicle Information */}
            <div className="space-y-6">
              <div>
                <h1 className="text-white text-4xl font-bold mb-2">
                  {selectedVehicle.year} {selectedVehicle.make}{" "}
                  {selectedVehicle.model}
                </h1>
                <div className="flex items-center space-x-4 mb-4">
                  <span className="text-green-400 font-bold text-3xl">
                    {getDisplayPrice(selectedVehicle)}
                  </span>
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <span className="text-white/60 text-sm">Stock Number</span>
                  <p className="text-white font-bold text-lg">
                    {selectedVehicle.stockNumber}
                  </p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <span className="text-white/60 text-sm">Mileage</span>
                  <p className="text-white font-bold text-lg">
                    {selectedVehicle.mileage?.toLocaleString() || "N/A"} mi
                  </p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <span className="text-white/60 text-sm">Engine</span>
                  <p className="text-white font-bold text-lg">
                    {selectedVehicle.engine || "N/A"}
                  </p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <span className="text-white/60 text-sm">Color</span>
                  <p className="text-white font-bold text-lg">
                    {selectedVehicle.color || "N/A"}
                  </p>
                </div>
              </div>

              {Array.isArray(selectedVehicle.features) && selectedVehicle.features.length > 0 && (
                <div className="bg-white/10 rounded-lg p-4">
                  <h3 className="text-white font-bold text-xl mb-3">Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ul className="list-disc list-inside space-y-1 text-white/90">
                      {selectedVehicle.features
                        .slice(0, Math.ceil(selectedVehicle.features.length / 2))
                        .map((feature, idx) => (
                          <li key={`feat-left-${idx}`}>{feature}</li>
                        ))}
                    </ul>
                    <ul className="list-disc list-inside space-y-1 text-white/90">
                      {selectedVehicle.features
                        .slice(Math.ceil(selectedVehicle.features.length / 2))
                        .map((feature, idx) => (
                          <li key={`feat-right-${idx}`}>{feature}</li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={() => scheduleViewing(selectedVehicle)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-3"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Schedule Test Drive
                </Button>
                <Button
                  onClick={() => toggleFavorite(Number(selectedVehicle.id))}
                  variant="outline"
                  className="w-full border-white/30 text-white hover:bg-white/10"
                >
                  <Heart
                    className={`w-5 h-5 mr-2 ${favorites.has(Number(selectedVehicle.id)) ? "fill-current text-red-500" : ""}`}
                  />
                  {favorites.has(Number(selectedVehicle.id))
                    ? "Remove from Favorites"
                    : "Add to Favorites"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Browse More Vehicles Section */}
      <div className="relative z-10 bg-gradient-to-r from-black/40 to-black/20 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white text-2xl font-bold">
                Browse More Vehicles
              </h2>
              <p className="text-white/70">
                Explore our complete luxury collection
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <span className="text-white/70 text-sm">
                  {filteredVehicles.length} vehicles
                </span>
              </div>
              <Button
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "list" : "grid")
                }
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
              <Input
                placeholder="Search by make, model, or year..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder-white/50"
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
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            >
              <option value="">All Makes</option>
              {makes.map((make) => (
                <option key={make} value={make} className="bg-slate-800">
                  {make}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "price" | "year" | "make")
              }
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            >
              <option value="year" className="bg-slate-800">
                Newest First
              </option>
              <option value="price" className="bg-slate-800">
                Price: Low to High
              </option>
              <option value="make" className="bg-slate-800">
                Make: A to Z
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicle Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVehicles
              .filter((v) => v.id !== selectedVehicle.id)
              .map((vehicle, index) => (
                <Card
                  key={vehicle.id}
                  className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-500 group hover-lift"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="relative">
                    <div className="aspect-video overflow-hidden">
                      <Image
                        src={
                          vehicle.media?.[0]?.url ||
                          vehicle.images?.[0] ||
                          "/placeholder.png"
                        }
                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        width={400}
                        height={300}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>

                    {/* Overlay Controls */}
                    <div className="absolute top-3 right-3 flex space-x-2">
                      <Button
                        size="icon"
                        onClick={() => toggleFavorite(Number(vehicle.id))}
                        className={`w-8 h-8 rounded-full border-0 transition-all ${
                          favorites.has(Number(vehicle.id))
                            ? "bg-red-500/80 hover:bg-red-600"
                            : "bg-black/50 hover:bg-black/70"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${favorites.has(Number(vehicle.id)) ? "fill-current" : ""}`}
                        />
                      </Button>
                      <Button
                        size="icon"
                        onClick={() => copyShareLink(vehicle)}
                        className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 border-0"
                      >
                        {copiedLink === Number(vehicle.id) ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-bold text-lg">
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

                    <p className="text-white/80 text-sm mb-3">
                      {vehicle.model}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <span className="text-green-400 font-bold text-xl">
                        {getDisplayPrice(vehicle)}
                      </span>
                      <span className="text-white/60 text-sm">
                        Stock #{vehicle.stockNumber}
                      </span>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        onClick={() => router.push(`/customer/${vehicle.id}`)}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-sm"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVehicles
              .filter((v) => v.id !== selectedVehicle.id)
              .map((vehicle, index) => (
                <Card
                  key={vehicle.id}
                  className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-xl border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-500 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center p-6">
                    <div className="w-32 h-24 rounded-lg overflow-hidden mr-6">
                      <Image
                        src={
                          vehicle.media?.[0]?.url ||
                          vehicle.images?.[0] ||
                          "/placeholder.png"
                        }
                        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                        width={128}
                        height={96}
                        className="w-full h-full object-cover"
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
                            onClick={() => toggleFavorite(Number(vehicle.id))}
                            className={`w-8 h-8 rounded-full border-0 ${
                              favorites.has(Number(vehicle.id))
                                ? "bg-red-500/80 hover:bg-red-600"
                                : "bg-white/10 hover:bg-white/20"
                            }`}
                          >
                            <Heart
                              className={`w-4 h-4 ${favorites.has(Number(vehicle.id)) ? "fill-current" : ""}`}
                            />
                          </Button>
                          <Button
                            size="icon"
                            onClick={() => copyShareLink(vehicle)}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border-0"
                          >
                            {copiedLink === Number(vehicle.id) ? (
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
                            {getDisplayPrice(vehicle)}
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

                      <div className="flex space-x-3">
                        <Button
                          onClick={() => router.push(`/customer/${vehicle.id}`)}
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
                          {copiedLink === Number(vehicle.id)
                            ? "Copied!"
                            : "Share Link"}
                        </Button>
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
    </div>
  );
}
