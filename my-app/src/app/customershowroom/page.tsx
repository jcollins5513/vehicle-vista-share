"use client";

import React, { useState, useEffect } from "react";
import { getShowroomDataAction } from "@/app/actions";
import {
  Car,
  Share2,
  Heart,
  Eye,
  DollarSign,
  Calendar,
  Filter,
  Grid,
  List,
  Search,
  Sparkles,
  Lightning,
  Award,
  Star,
  ChevronRight,
  Copy,
  Check,
  Camera,
  Video,
  Phone,
  MessageSquare,
  MapPin,
  Clock,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import type { VehicleWithMedia } from "@/types";

export default function CustomerShowroomPage() {
  const [vehicles, setVehicles] = useState<VehicleWithMedia[]>([]);
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
      setCopiedLink(vehicle.id);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">
            Loading Premium Collection
          </h2>
          <p className="text-white/70">Preparing your luxury experience...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-red-950 to-slate-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">
            Service Unavailable
          </h2>
          <p className="text-white/70 mb-4">Error loading vehicles: {error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">
            Collection Coming Soon
          </h2>
          <p className="text-white/70">
            Our premium vehicles are being prepared for display.
          </p>
        </div>
      </div>
    );
  }

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

      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-black/40 to-black/20 backdrop-blur-xl border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-600 rounded-xl flex items-center justify-center">
                <img
                  src="/Bentley-logo-groups.svg"
                  alt="Bentley Logo"
                  className="w-8 h-8 object-contain filter brightness-0 invert"
                />
              </div>
              <div>
                <h1 className="text-white text-3xl font-bold bg-gradient-to-r from-white via-yellow-100 to-blue-100 bg-clip-text text-transparent">
                  Customer Showroom
                </h1>
                <p className="text-white/70">
                  Discover Your Perfect Luxury Vehicle
                </p>
              </div>
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

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVehicles.map((vehicle, index) => (
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
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                      <Lightning className="w-3 h-3 inline mr-1" />
                      SPECIAL OFFER
                    </div>
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

                  <p className="text-white/80 text-sm mb-3">{vehicle.model}</p>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-green-400 font-bold text-xl">
                      ${vehicle.price?.toLocaleString() || "Contact for Price"}
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

                    <div className="flex space-x-3">
                      <Button
                        onClick={() =>
                          window.open(`/customer/${vehicle.id}`, "_blank")
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
                        {copiedLink === vehicle.id ? "Copied!" : "Share Link"}
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
